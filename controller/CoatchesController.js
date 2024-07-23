import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { Schedule } from "../model/coachesSchedule.js";
import { coachServices } from "../model/coachservicesModal.js";
import { groupMembers } from "../model/groupMembers.js";

export const getCoaches = asyncErrors(async (req, res, next) => {
  const { groupId } = req.params;

  if (!groupId) {
    return next(new ErrorHandler("Group ID must be provided", 400));
  }

  try {
    let coaches = await groupMembers.findAll({
      where: {
        groupId,
        userType: "Coach",
      },
    });

    if (coaches.length === 0) {
      return res
        .status(404)
        .json({ message: "No coaches found in this group" });
    }

    res.status(200).json({
      success: true,
      message: "Coaches get successfully",
      coaches,
    });
  } catch (error) {
    console.error("Error retrieving coaches:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const addSchedule = asyncErrors(async (req, res, next) => {
  const { coachId } = req.params;

  if (!coachId) {
    return next(new ErrorHandler("coachId must be provided", 400));
  }
  const { days, fromTime, toTime } = req.body;

  if (!days || !fromTime || !toTime) {
    return next(new ErrorHandler("All fields must be provided", 400));
  }

  try {
    let coach = await groupMembers.findOne({
      where: {
        userId: coachId,
        userType: "Coach",
      },
    });

    if (!coach) {
      return next(new ErrorHandler("Invalid coachId provided", 404));
    }

    const schedule = await Schedule.create({
      coachId,
      days,
      fromTime,
      toTime,
    });

    res.status(201).json({
      success: true,
      message: "Schedule added successfully",
      schedule,
    });
  } catch (error) {
    console.error("Error adding schedule:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const getCoachSchedules = asyncErrors(async (req, res, next) => {
  const { coachId } = req.params;

  if (!coachId) {
    return next(new ErrorHandler("coachId must be provided", 400));
  }

  try {
    const coach = await groupMembers.findOne({
      where: {
        userId: coachId,
        userType: "Coach",
      },
    });

    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }

    const schedules = await Schedule.findAll({
      where: {
        coachId: coach.userId,
      },
    });

    // Group schedules by day
    const groupedSchedules = {
      Monday: schedules.filter((schedule) => schedule.days === "Monday"),
      Tuesday: schedules.filter((schedule) => schedule.days === "Tuesday"),
      Wednesday: schedules.filter((schedule) => schedule.days === "Wednesday"),
      Thursday: schedules.filter((schedule) => schedule.days === "Thursday"),
      Friday: schedules.filter((schedule) => schedule.days === "Friday"),
      Saturday: schedules.filter((schedule) => schedule.days === "Saturday"),
      Sunday: schedules.filter((schedule) => schedule.days === "Sunday"),
    };

    res.status(200).json({
      success: true,
      message: "Schedules retrieved successfully",
      coach: {
        coachId: coach.userId,
        schedules: groupedSchedules,
      },
    });
  } catch (error) {
    console.error("Error retrieving schedules:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const addCoachServices = asyncErrors(async (req, res, next) => {
  const { coachId } = req.params;

  if (!coachId) {
    return next(new ErrorHandler("coachId must be provided", 400));
  }
  const { title, description, price } = req.body;

  if (!title || !description || !price) {
    return next(new ErrorHandler("All fields must be provided", 400));
  }

  try {
    let coach = await groupMembers.findOne({
      where: {
        userId: coachId,
        userType: "Coach",
      },
    });

    if (!coach) {
      return next(new ErrorHandler("Invalid coachId provided", 404));
    }

    const coachService = await coachServices.create({
      coachId,
      title,
      description,
      price,
    });

    res.status(201).json({
      success: true,
      message: "Services added successfully",
      coachService,
    });
  } catch (error) {
    console.error("Error adding Services:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const getCoachServices = asyncErrors(async (req, res, next) => {
  const { coachId } = req.params;

  if (!coachId) {
    return next(new ErrorHandler("coachId must be provided", 400));
  }

  try {
    const coach = await groupMembers.findOne({
      where: {
        userId: coachId,
        userType: "Coach",
      },
    });

    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }

    const services = await coachServices.findAll({
      where: {
        coachId: coach.userId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Services retrieved successfully",
      coachServices: {
        coachId: coach.userId,
        services,
      },
    });
  } catch (error) {
    console.error("Error retrieving Services:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});
