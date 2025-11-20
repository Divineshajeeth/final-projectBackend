import mongoose from "mongoose";

const supplierSchema = mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, "Supplier name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"]
    },
    
    bottleSize: { 
      type: String, 
      required: [true, "Bottle size is required"],
      trim: true
    },                                      // "500ml", "1L", "2L", etc.
    
    bottleCount: { 
      type: Number, 
      required: [true, "Bottle count is required"],
      min: [1, "Bottle count must be at least 1"]
    },                                      // Number of bottles supplied
    
    contactNo: { 
      type: String, 
      required: [true, "Contact number is required"],
      trim: true,
      minlength: [5, "Contact number must be at least 5 characters long"]
    },
    
    bottlePrice: { 
      type: Number, 
      default: 1, 
      immutable: true 
    },                                       // Fixed at ₹1 per bottle, cannot be changed
    
    deliveryStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'],
      default: 'pending'
    },                                        // Delivery tracking status
    
    deliveryDate: {
      type: Date,
      default: Date.now
    },                                        // When delivery was submitted
    
    confirmedDate: Date,                     // When admin confirmed delivery
    deliveredDate: Date,                      // When delivery was completed
    
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"]
    },                                        // Additional delivery notes
    
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }                                         // Reference to the user who submitted
  },
  { timestamps: true }
);

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
