
import axios from "axios";

// export const getPickleballCourts = async () => {

//     const query = 'pickleball courts';
//     const locations = [
//         // '32.806671,-86.791130',    // Alabama
//         // '58.301935,-134.419740',   // Alaska
//         // '33.448376,-112.074036',   // Arizona
//         // '34.746483,-92.289597',    // Arkansas
//         // '38.897438,-77.026817',    // District of Columbia
//         '27.994402,-81.760254',    // Florida
//         // '33.748997,-84.387985',    // Georgia
//         // '21.304810,-157.857819',   // Hawaii
//         // '43.615829,-116.202313',   // Idaho
//         // '39.783730,-89.650148',    // Illinois
//         // '39.790942,-86.147685',    // Indiana
//         // '41.590832,-93.620865',    // Iowa
//         // '39.048191,-95.677956',    // Kansas
//         // '37.669002,-84.651428',    // Kentucky
//         // '30.973377,-91.429910',    // Louisiana
//         // '45.601631,-91.738632',    // Wisconsin (northwest corner)
//         // '46.603354,-112.038127',   // Montana (southwest corner)
//         // '41.492537,-99.901810',    // Nebraska
//         // '39.323777,-74.771866',    // New Jersey
//         // '35.682240,-105.939728',   // New Mexico
//         // '42.652580,-73.756233',    // New York
//         // '35.214563,-79.891266',    // North Carolina
//         // '39.962260,-83.000706',    // Ohio
//         // '35.472031,-97.521068',    // Oklahoma
//         // '44.938461,-123.030403',   // Oregon
//         // '40.269789,-76.875613',    // Pennsylvania
//         // '41.823989,-71.412834',    // Rhode Island
//         // '34.000710,-81.034814',    // South Carolina
//         // '44.367032,-100.346405',   // South Dakota
//         // '36.165810,-86.784241',    // Tennessee
//         // '30.274670,-97.740349',    // Texas
//         // '40.760781,-111.891047',   // Utah
//         // '44.264381,-72.571946',    // Vermont
//         // '37.540725,-77.436048',    // Virginia
//         // '47.346959,-120.500740',   // Washington
//         // '38.491226,-80.954456',    // West Virginia
//         // '43.074684,-89.384445',    // Wisconsin
//         // '41.145548,-104.802042',   // Wyoming
//         // '44.786297,-89.826705',    // Wisconsin (northernmost point)
//         // '25.953680,-81.491606',    // Florida (southernmost point)
//         // '61.594340,-149.098775',   // Alaska (northernmost point)
//         // '17.998738,-66.204534',    // Puerto Rico
//         // '14.577450,121.035690',    // Philippines
//     ];
    
//     const radius = 50000; 

//     try {
//         let allResults = [];
        
//         for (const location of locations) {
//             let nextPageToken = null;
//             do {
//                 const params = {
//                     query,
//                     location,
//                     radius,
//                     key: GOOGLE_MAPS_API_KEY
//                 };

//                 if (nextPageToken) {
//                     params.pagetoken = nextPageToken;
//                 }

//                 const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', { params });

//                 allResults = allResults.concat(response.data.results);
//                 nextPageToken = response.data.next_page_token;

//                 await new Promise(resolve => setTimeout(resolve, 2000)); // Slightly longer delay for pagination
//             } while (nextPageToken);
//         }

//         console.log(allResults.length);
//         return allResults;
//     } catch (error) {
//         console.error('Error fetching pickleball courts data:', error);
//         throw error;
//     }
// };

const apiKey = process.env.GOOGLE_MAP_API_KEY;
// const radius = 50000;

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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getPickleballCourts = async (latitude, longitude, pageToken = null, retries = 3) => {
    try {
        const params = {
            query: 'pickleball courts in USA',
            location: `${latitude},${longitude}`,
            radius: 50000,
            key: apiKey,
        };

        if (pageToken) {
            params.pagetoken = pageToken;
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', { params });

        if (response.data.status === 'REQUEST_DENIED') {
            throw new Error('API key is invalid or not authorized');
          }

        const courts = response.data.results.map(place => ({
            name: place.name,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            vicinity: place.vicinity,
            courtId: place.place_id,
            address: place.formatted_address || place.vicinity,
            opening_hours: place.opening_hours ? place.opening_hours.weekday_text : 'Not Available',
            rating: place.rating || 'Not Rated',
            user_ratings_total: place.user_ratings_total || 0,
            icon: place.icon,
        }));

        return {
            courts,
            nextPageToken: response.data.next_page_token || null,
        };
    } catch (error) {
        if (retries === 0) {
            console.error('Error fetching pickleball courts:', error.message);
            return {
                courts: [],
                nextPageToken: null,
            };
        }
        await delay(1000); // Wait for 1 second before retrying
        return getPickleballCourts(latitude, longitude, pageToken, retries - 1);
    }
};


