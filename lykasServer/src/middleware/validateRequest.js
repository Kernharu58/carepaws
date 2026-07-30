/**
 * §11.1 — validates a request against a zod schema and returns a
 * consistent 400 shape both frontends can map straight onto form fields:
 *   { success: false, message: "Validation failed", errors: [{ field, message }] }
 *
 * `source` selects which part of the request the schema validates
 * (defaults to the body, since that's by far the common case).
 */
function validateRequest(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join(".") || source,
          message: issue.message,
        })),
      });
    }

    req[source] = result.data;
    next();
  };
}

module.exports = validateRequest;
