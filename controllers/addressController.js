const {
  UserBindingPage,
} = require("twilio/lib/rest/ipMessaging/v2/service/user/userBinding");
const Address = require("../models/addressmodell");
const User = require("../models/usermodel");

const addAddress = async (req, res) => {
  try {
    const User = req.session.user;
    const userId = req.session.user?.id;

    const newAddress = req.body;
    let deliveryAddress = {
      name: newAddress.name,
      mobile: newAddress.mobile,
      email: newAddress.email,
      address: newAddress.address,
      district: newAddress.district,
      state: newAddress.state,
      country: newAddress.country,
      pincode: newAddress.pincode,
    };

    const isAddress = await Address.findOne({ user: userId }); // Use the userId in the query

    if (isAddress) {
      await Address.updateOne(
        { user: userId },
        {
          $push: { deliveryAddress },
        }
      );
    } else {
      const newAddressInstance = new Address({
        user: userId,
        deliveryAddress,
      });
      await newAddressInstance.save();
    }
    res.render("/checkout", { User });
  } catch (error) {
    console.log(error);
  }
};
const addProfileAddress = async (req, res) => {
  try {
    const userId = req.session.user?.id;

    const newAddress = req.body;
    let deliveryAddress = {
      name: newAddress.name,
      mobile: newAddress.mobile,
      email: newAddress.email,
      address: newAddress.address,
      district: newAddress.district,
      state: newAddress.state,
      country: newAddress.country,
      pincode: newAddress.pincode,
    };

    const isAddress = await Address.findOne({ user: userId }); // Use the userId in the query

    if (isAddress) {
      await Address.updateOne(
        { user: userId },
        {
          $push: { deliveryAddress },
        }
      );
    } else {
      const newAddressInstance = new Address({
        user: userId,
        deliveryAddress,
      });
      await newAddressInstance.save();
    }
    res.redirect("/profile");
  } catch (error) {
    console.log(error);
  }
};

const user_Address = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const user = await User.findById(user_id);

    if (!user) {
      return res.redirect("/login");
    }
    const addressItem = await Address.find({ user: user_id });

    res.render("address", { user, addressItem });
  } catch (error) {
    console.log(error.message);
  }
};

const pdeleteAddress = async (req, res) => {
  const addressId = req.params.addressId;
  try {
    // Delete the address by ID
    const deletedAddress = await Address.findByIdAndDelete({ _id: addressId });
  
    if (!deletedAddress) {
      // Address not found
      // req.flash("error", "Address not found");
      return res.status(404).json({ message: "Address not found" });
    }

    // Address deleted successfully
    // req.flash("success", "Address deleted successfully");
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error(error);
    // req.flash("error", "Failed to delete address");
    res.status(500).json({ message: "Failed to delete address" });
  }
};

const editProfileAddress = async (req, res) => {
  try {
    const id = req.query.id;
    const userI = req.session.user?.id;
    const userid = userI.toString();

    const addressQuery = { user: userid, "deliveryAddress._id": id };
    const updateFields = {
      $set: {
        "deliveryAddress.$.name": req.body.editName,
        "deliveryAddress.$.address": req.body.address,
        "deliveryAddress.$.email": req.body.email,
        "deliveryAddress.$.mobile": req.body.mobile,
        "deliveryAddress.$.pincode": req.body.pincode,
        "deliveryAddress.$.district": req.body.district,
        "deliveryAddress.$.state": req.body.state,
        "deliveryAddress.$.country": req.body.country,
      },
    };

    await Address.updateOne(addressQuery, updateFields);

    res.redirect("/profile");
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  addAddress,
  // editaddress
  user_Address,
  addProfileAddress,
  pdeleteAddress,
  editProfileAddress,
};
