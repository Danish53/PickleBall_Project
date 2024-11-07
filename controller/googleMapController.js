import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { chatGroups } from "../model/chatGroupsModel.js";
import { groupMembers } from "../model/groupMembers.js";
import { Users } from "../model/userModel.js";
import {
  generateGridPoints,
  getCourtDetailsById,
  getPickleballCourts,
} from "../utils/courts.js";

// const apiKey = process.env.GOOGLE_MAP_API_KEY;
//admin & user
export const pickleballCourts = asyncErrors(async (req, res, next) => {
  const { page = 1, pageSize = 15 } = req.query;
  const gridPoints = generateGridPoints();
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + parseInt(pageSize, 15);
  let totalCourtsCount = 0;
  let allCourts = [];

  const fetchCourts = async (point) => {
    const { courts } = await getPickleballCourts(
      point.latitude,
      point.longitude
    );
    return courts;
  };

  const promises = gridPoints.map((point) => fetchCourts(point));
  const results = await Promise.all(promises);

  results.forEach((courts) => {
    totalCourtsCount += courts.length;
    allCourts = allCourts.concat(courts);
  });

  const paginatedCourts = allCourts.slice(startIndex, endIndex);

  res.status(200).json({
    success: true,
    message: "All Courts in USA fetched successfully.",
    totalCourtsCount,
    totalPages: Math.ceil(totalCourtsCount / pageSize),
    currentPage: parseInt(page, 15),
    courts: paginatedCourts,
  });
});

//user
export const searchCourts = asyncErrors(async (req, res, next) => {
  const { latitude, longitude } = req.params;

  if (!latitude || !longitude) {
    return next(new ErrorHandler("Latitude and longitude are required", 400));
  }

  const radius = 10000;
  const courts = await getPickleballCourts(latitude, longitude, radius);

  const totalCourts = courts.length;

  if (totalCourts === 0) {
    return res.status(404).json({
      success: false,
      message: "No courts found for the given location",
    });
  }

  const courtData = courts.map((court) => ({
    id: court.place_id,
    name: court.name,
  }));

  res.status(200).json({
    success: true,
    message: "Courts fetched successfully",
    totalCourts,
    courts: courtData,
  });
});


export const getCourtDetails = asyncErrors(async (req, res, next) => {
  const { place_id } = req.params;

  if (!place_id) {
    return next(new ErrorHandler("Court ID is required", 400));
  }

  const court = await getCourtDetailsById(place_id);

  if (!court) {
    return next(new ErrorHandler("Court not found", 404));
  }

  if (!court.place_id) {
    return next(new ErrorHandler("Court ID not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Court details fetched successfully",
    court,
  });
});

// create group
export const createGroup = asyncErrors(async (req, res, next) => {
  const { place_id, userId } = req.params;

  // Check if the required parameters are present
  if (!place_id || !userId) {
    return next(new ErrorHandler("Court ID and User ID must be provided", 400));
  }

  try {
    // Fetch court details
    const court = await getCourtDetailsById(place_id);

    // Validate if the court exists
    if (!court) {
      return next(new ErrorHandler("Court not found for the provided ID", 404));
    }

    // Check if the user exists
    const user = await Users.findOne({ where: { id: userId } });
    if (!user) {
      return next(new ErrorHandler("User not found", 400));
    }

    // Check if a group already exists for this court
    let group = await chatGroups.findOne({ where: { courtId: court.place_id } });

    if (group) {
      // Check if the user is already part of the existing group
      const isUserAlreadyInGroup = await groupMembers.findOne({
        where: { userId: user.id, groupId: group.id },
      });

      if (isUserAlreadyInGroup) {
        return res.status(200).json({
          success: true,
          message: "User is already part of the group",
          group,
        });
      }

      // Add user to the group if not already a member
      await groupMembers.create({
        groupId: group.id,
        groupName: group.groupName,
        latitude: group.latitude,
        longitude: group.longitude,
        userId: user.id,
        userPhoneNumber: user.phoneNumber,
        userName: user.name,
        userType: user.userType,
        profileAvatar: user.profileAvatar,
      });

      return res.status(200).json({
        success: true,
        message: "User successfully joined the group",
        group,
      });
    }

    // Create a new group if none exists for the court
    const admin = await Users.findOne({ where: { isAdmin: true } });
    
    // If no admin user exists, return an error or set the current user as admin
    if (!admin) {
      return next(new ErrorHandler("No admin user found", 400));
    }

    // Create a new group
    group = await chatGroups.create({
      courtId: court.place_id,
      courtName: court.name,
      groupName: court.name,
      latitude: court.geometry.location.lat,
      longitude: court.geometry.location.lng,
      adminId: admin.id,
    });

    // Add the user to the newly created group
    await groupMembers.create({
      groupId: group.id,
      groupName: group.groupName,
      latitude: group.latitude,
      longitude: group.longitude,
      userId: user.id,
      userPhoneNumber: user.phoneNumber,
      userName: user.name,
      userType: user.userType,
      profileAvatar: user.profileAvatar,
    });

    return res.status(200).json({
      success: true,
      message: "Group created and user successfully added",
      group,
    });
  } catch (error) {
    console.error("Error creating or joining group:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});




//admin
export const chatGroup = asyncErrors(async (req, res, next) => {
  const { courtId } = req.params;
  const { groupName } = req.body;

  if (!courtId) {
    return next(new ErrorHandler("Court ID must be provided", 400));
  }

  if (!groupName) {
    return next(new ErrorHandler("Group Name must be provided", 400));
  }

  try {
    const courts = await getPickleballCourts();
    console.log(courts);

    if (!Array.isArray(courts)) {
      return next(new ErrorHandler("Failed to retrieve courts data", 500));
    }

    let court = courts.find((court) => String(court.courtId) === courtId);
    if (!court) {
      return next(
        new ErrorHandler(
          "Invalid Court ID or no courts found for the provided ID",
          400
        )
      );
    }

    const existingGroup = await chatGroups.findOne({ where: { courtId } });
    if (existingGroup) {
      return next(new ErrorHandler("Group already exists", 400));
    }

    let admin = await Users.findOne({ where: { isAdmin: true } });
    if (!admin) {
      return next(new ErrorHandler("No admin user found", 400));
    }

    const group = await chatGroups.create({
      courtId: court.courtId,
      groupName,
      latitude: court.latitude,
      longitude: court.longitude,
      courtName: court.name,
      adminId: admin.id,
    });

    console.log(admin);

    // Add admin as a member of the group
    await groupMembers.create({
      groupId: group.id,
      userId: admin.id,
      userPhoneNumber: admin.phoneNumber,
      userName: admin.userName,
      userType: admin.userType,
      profileAvatar: admin.profileAvatar,
    });

    console.log(admin.phoneNumber);

    res.status(200).json({
      success: true,
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    console.error("Error adding group:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

//admin
export const allGroupsList = asyncErrors(async (req, res, next) => {
  try {
    const groups = await chatGroups.findAll();

    let totalGroups = groups.length;

    if (!groups || groups.length === 0) {
      return next(new ErrorHandler("No Groups Found!", 404));
    }
    res.status(200).json({
      success: true,
      message: "All Groups List",
      totalGroups,
      groups,
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
