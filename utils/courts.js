import axios from "axios";

const apiKey = process.env.GOOGLE_MAP_API_KEY;

export const generateGridPoints = (step = 1.0) => {
  const usaBounds = {
    north: 49.384358,
    south: 24.396308,
    east: -66.93457,
    west: -125.00165,
  };
  const points = [];
  for (let lat = usaBounds.south; lat <= usaBounds.north; lat += step) {
    for (let lng = usaBounds.west; lng <= usaBounds.east; lng += step) {
      points.push({ latitude: lat, longitude: lng });
    }
  }
  return points;
};

export const getPickleballCourts = async (latitude, longitude, radius) => {
  let courts = [];
  let nextPageToken = null;

  do {
    const params = {
      location: `${latitude},${longitude}`,
      radius: radius,
      keyword: "pickleball court",
      key: apiKey,
    };

    if (nextPageToken) {
      params.pagetoken = nextPageToken;
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
      { params }
    );

    courts = courts.concat(response.data.results);
    //    courts = response.data.results.map(place => ({
    //     courtId: place.place_id,
    //     courtName: place.name,
    //     // latitude: place.geometry.location.lat,
    //     // longitude: place.geometry.location.lng,
    //     // vicinity: place.vicinity,
    //     // address: place.formatted_address || place.vicinity,
    //     // opening_hours: place.opening_hours ? place.opening_hours.weekday_text : 'Not Available',
    //     // rating: place.rating || 'Not Rated',
    //     // user_ratings_total: place.user_ratings_total || 0,
    //     // icon: place.icon,
    // }));

    nextPageToken = response.data.next_page_token;

    if (nextPageToken) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } while (nextPageToken);

  const detailedCourts = await Promise.all(
    courts.map(async (court) => {
      const courtDetails = await getCourtDetailsById(court.place_id);

      return {
        ...court,
      };
    })
  );

  return detailedCourts;
};

export const getCourtDetailsById = async (place_id) => {
  try {
    const params = {
      place_id, 
      key: apiKey,       
    };

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`,
      { params }
    );

    return response.data.result;

  } catch (error) {
    console.error("Error fetching court details:", error);
    throw error;
  }
};
