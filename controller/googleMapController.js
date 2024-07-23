import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { chatGroups } from "../model/chatGroupsModel.js";
import { groupMembers } from "../model/groupMembers.js";
import { Users } from "../model/userModel.js";
import { generateGridPoints, getPickleballCourts } from "../utils/courts.js";

//admin & user
export const pickleballCourts = asyncErrors(async (req, res, next) => {
  const { page = 1, pageSize = 15 } = req.query;
  const gridPoints = generateGridPoints();
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + parseInt(pageSize, 15);
  let totalCourtsCount = 0;
  let allCourts = [];

  const fetchCourts = async (point) => {
      const { courts } = await getPickleballCourts(point.latitude, point.longitude);
      return courts;
  };

  const promises = gridPoints.map(point => fetchCourts(point));
  const results = await Promise.all(promises);

  results.forEach(courts => {
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
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return next(new ErrorHandler("Latitude and longitude are required", 400));
  }

  // Fetch pickleball courts for the given location
  const courts = await getPickleballCourts(latitude, longitude);

  // res.json({ totalCourts: courts.length, courts });
  res.status(200).json({
    success: true,
    message: "Search successfully",
    totalCourts: courts.length,
    courts,
  });
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
    console.log(courts)

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
