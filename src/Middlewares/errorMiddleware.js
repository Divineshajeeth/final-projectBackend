export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log error for debugging
  console.error(`Error ${statusCode}: ${err.message}`);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      details: message
    });
  }
  
  // Mongoose duplicate key error
  // if (err.code === 11000) {
  //   const field = Object.keys(err.keyValue)[0];
  //   return res.status(400).json({
  //     success: false,
  //     message: `${field} already exists`,
  //     field: field
  //   });
  // }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(400).json({
      success: false,
      message: `${field} already exists: ${value}`,
      field: field
    });
  }
  


  
  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  const errorResponse = {
    success: false,
    message: err.message
  };
  
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
};
