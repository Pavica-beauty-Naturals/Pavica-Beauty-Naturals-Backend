import User from "../models/User.js";

class UserController {
  // Get user profile with addresses
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "success",
        data: {
          user,
          addresses: user.addresses || [],
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get profile",
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const { firstName, lastName, phone } = req.body;
      const updateData = {};

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone) updateData.phone = phone;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No valid fields to update",
        });
      }

      const user = await User.findByIdAndUpdate(req.user.id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "success",
        message: "Profile updated successfully",
        data: { user },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update profile",
      });
    }
  }

  // Add user address
  static async addAddress(req, res) {
    try {
      const {
        type,
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country = "India",
        isDefault = false,
      } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // If this is set as default, unset other defaults of the same type
      if (isDefault) {
        user.addresses.forEach((address) => {
          if (address.type === type) {
            address.isDefault = false;
          }
        });
      }

      const newAddress = {
        type,
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        isDefault,
      };

      user.addresses.push(newAddress);
      await user.save();

      const addedAddress = user.addresses[user.addresses.length - 1];

      res.status(201).json({
        status: "success",
        message: "Address added successfully",
        data: { address: addedAddress },
      });
    } catch (error) {
      console.error("Add address error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to add address",
      });
    }
  }

  // Get user addresses
  static async getAddresses(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "success",
        data: { addresses: user.addresses || [] },
      });
    } catch (error) {
      console.error("Get addresses error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get addresses",
      });
    }
  }

  // Update user address
  static async updateAddress(req, res) {
    try {
      const addressId = req.params.id;
      const {
        type,
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        isDefault,
      } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const address = user.addresses.id(addressId);
      if (!address) {
        return res.status(404).json({
          status: "error",
          message: "Address not found",
        });
      }

      // If setting as default, unset other defaults of the same type
      if (isDefault && type) {
        user.addresses.forEach((addr) => {
          if (addr.type === type && addr._id.toString() !== addressId) {
            addr.isDefault = false;
          }
        });
      }

      // Update address fields
      if (type) address.type = type;
      if (fullName) address.fullName = fullName;
      if (phone) address.phone = phone;
      if (addressLine1) address.addressLine1 = addressLine1;
      if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
      if (city) address.city = city;
      if (state) address.state = state;
      if (postalCode) address.postalCode = postalCode;
      if (country) address.country = country;
      if (isDefault !== undefined) address.isDefault = isDefault;

      await user.save();

      res.json({
        status: "success",
        message: "Address updated successfully",
        data: { address },
      });
    } catch (error) {
      console.error("Update address error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update address",
      });
    }
  }

  // Delete user address
  static async deleteAddress(req, res) {
    try {
      const addressId = req.params.id;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const address = user.addresses.id(addressId);
      if (!address) {
        return res.status(404).json({
          status: "error",
          message: "Address not found",
        });
      }

      address.remove();
      await user.save();

      res.json({
        status: "success",
        message: "Address deleted successfully",
      });
    } catch (error) {
      console.error("Delete address error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete address",
      });
    }
  }

  // Get all users (Admin only)
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, role } = req.query;
      const offset = (page - 1) * limit;

      // Build query
      const query = {};
      if (role) query.role = role;
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query)
        .select("-addresses")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit));

      const totalUsers = await User.countDocuments(query);

      res.json({
        status: "success",
        data: {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            hasNext: offset + limit < totalUsers,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get users",
      });
    }
  }
}

export default UserController;
