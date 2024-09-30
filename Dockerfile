# Step 1: Use a base image
FROM node:20-alpine

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Step 4: Install app dependencies
RUN npm install --production

# Step 5: Copy the rest of the application code to the working directory
COPY . .

# Step 6: Expose the port your app runs on
EXPOSE 8000 

# Step 7: Define the command to run your app
CMD ["node", "app.js"]
