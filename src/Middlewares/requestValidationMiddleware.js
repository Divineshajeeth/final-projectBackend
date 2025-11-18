// Request validation middleware for user registration
export const validateUserRegistration = (req, res, next) => {
  console.log("=== VALIDATION MIDDLEWARE ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.originalUrl);
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Request body:", req.body);
  
  // Check if body exists
  if (!req.body || Object.keys(req.body).length === 0) {
    console.log("Request body is empty");
    return res.status(400).json({
      success: false,
      message: "Request body is empty. Please provide user data.",
      hint: "Make sure you're sending JSON data with Content-Type: application/json"
    });
  }
  
  const { name, email, password, role } = req.body;
  
  // Detailed validation
  const errors = [];
  
  if (!name) {
    errors.push("name is required");
  } else if (typeof name !== 'string') {
    errors.push("name must be a string");
  } else if (name.trim().length < 2) {
    errors.push("name must be at least 2 characters long");
  }
  
  if (!email) {
    errors.push("email is required");
  } else if (typeof email !== 'string') {
    errors.push("email must be a string");
  }
  
  if (!password) {
    errors.push("password is required");
  } else if (typeof password !== 'string') {
    errors.push("password must be a string");
  } else if (password.length < 6) {
    errors.push("password must be at least 6 characters long");
  }
  
  if (role && typeof role !== 'string') {
    errors.push("role must be a string");
  }
  
  if (errors.length > 0) {
    console.log("Validation errors:", errors);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors
    });
  }
  
  console.log("Validation passed");
  next();
};

// General request body validator
export const validateRequestBody = (req, res, next) => {
  console.log("=== BODY VALIDATION ===");
  console.log("Content-Type:", req.headers['content-type']);
  
  // Check if request has body but it's not parsed
  const contentType = req.headers['content-type'];
  if (req.headers['content-length'] > 0 && !req.body) {
    console.log("Request has content but body is not parsed");
    return res.status(400).json({
      success: false,
      message: "Request body could not be parsed",
      hint: "Make sure Content-Type header is set correctly"
    });
  }
  
  next();
};
