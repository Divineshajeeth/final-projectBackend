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
    }                                       // Fixed at ₹1 per bottle, cannot be changed
  },
  { timestamps: true }
);

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
