const { Server } = require("socket.io");
const { verifyAccessToken } = require("./utils/tokenUtils");
const User = require("./models/User");
const Message = require("./models/Message");
const { logger } = require("./utils/logger");

/**
 * §4 — Socket.io runs on the same HTTP server as the REST API, authenticated
 * via the same JWT at the handshake (auth.token, falling back to a Bearer
 * token in the handshake authorization header). Non-staff users auto-join a
 * private room keyed by their own user id; staff/admin/super_admin can
 * additionally join a shared `admin_room`, but only by explicitly emitting
 * `joinAdmin` — it is NOT automatic on connect, matching the real source.
 *
 * `sendMessage` persists to Mongo (Message model, Communication domain) and
 * emits `receiveMessage` to both the conversation owner's room and
 * `admin_room` in real time. `sender` is always derived server-side —
 * "user" if the socket's own user id matches the conversation's `userId`,
 * "shelter" otherwise — never trusting a client-supplied sender.
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

    socket.on("sendMessage", async (data, callback) => {
      try {
        const conversationUserId = String(data?.userId || "");
        if (!conversationUserId) throw new Error("userId is required");

        // Derived server-side, never from the client payload (§4).
        const sender = socket.user._id.toString() === conversationUserId ? "user" : "shelter";
        // Only the conversation owner or staff may post into a conversation.
        if (sender === "shelter" && !["staff", "admin", "super_admin"].includes(socket.user.role)) {
          throw new Error("Not authorized to post in this conversation");
        }

        const message = await Message.create({
          userId: conversationUserId,
          sender,
          text: data.text,
          image: data.image,
        });

        io.to(conversationUserId).to("admin_room").emit("receiveMessage", message);
        callback?.({ success: true, data: message });
      } catch (err) {
        logger.warn({ err: err.message }, "sendMessage failed");
        callback?.({ success: false, message: err.message });
      }
    });

    socket.on("disconnect", () => {
      logger.info({ userId: userRoom }, "Socket disconnected");
    });
  });

  return io;
}

module.exports = { attachSocketServer };
