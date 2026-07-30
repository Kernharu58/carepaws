const { Server } = require("socket.io");
const { verifyAccessToken } = require("./utils/tokenUtils");
const User = require("./models/User");
const { logger } = require("./utils/logger");

/**
 * §4 — Socket.io runs on the same HTTP server as the REST API, authenticated
 * via the same JWT at the handshake (auth.token, falling back to a Bearer
 * token in the handshake authorization header). Non-staff users auto-join a
 * private room keyed by their own user id; staff/admin/super_admin can
 * additionally join a shared `admin_room`, but only by explicitly emitting
 * `joinAdmin` — it is NOT automatic on connect, matching the real source.
 *
 * The `sendMessage`/`receiveMessage` chat events themselves depend on the
 * Message model, which lands with the Communication domain in a later
 * slice — this module wires the connection/auth/room layer they'll sit on
 * top of, rather than shipping a chat handler with nothing to persist to.
 */
function extractSocketToken(socket) {
  const fromAuth = socket.handshake.auth?.token;
  if (fromAuth) return fromAuth;

  const header = socket.handshake.headers?.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);

  return null;
}

function attachSocketServer(httpServer, corsOptions) {
  const io = new Server(httpServer, { cors: corsOptions });

  io.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket);
      if (!token) return next(new Error("Not authenticated"));

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.id);
      if (!user || user.isDeleted || user.status !== "active") {
        return next(new Error("Not authenticated"));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error("Not authenticated"));
    }
  });

  io.on("connection", (socket) => {
    const userRoom = socket.user._id.toString();
    socket.join(userRoom);
    logger.info({ userId: userRoom }, "Socket connected");

    // Staff/admin/super_admin must explicitly join — not automatic on connect.
    socket.on("joinAdmin", () => {
      if (["staff", "admin", "super_admin"].includes(socket.user.role)) {
        socket.join("admin_room");
      }
    });

    socket.on("disconnect", () => {
      logger.info({ userId: userRoom }, "Socket disconnected");
    });
  });

  return io;
}

module.exports = { attachSocketServer };
