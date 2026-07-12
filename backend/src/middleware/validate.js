/**
 * Zod schema validator middleware
 * Usage: validate(myZodSchema) — validates req.body
 * Usage: validate(schema, 'params') — validates req.params
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      next(err); // Passes ZodError to errorHandler
    }
  };
};

module.exports = { validate };
