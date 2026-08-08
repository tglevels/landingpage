import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from the environment.");
}

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  connection: null,
  promise: null,
};

global.mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from the environment.");
  }

  if (cached.connection && mongoose.connection.readyState === 1) {
    return cached.connection;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        /*
         * Kept under the serverless function budget so a
         * connection problem surfaces as a clean 500 instead
         * of the platform killing the invocation mid-wait.
         */
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,

        /*
         * Each serverless instance gets its own pool, so keep
         * it small to avoid exhausting the Atlas connection
         * limit when many instances are warm at once.
         */
        maxPoolSize: 10,
      })
      .then((instance) => {
        console.log("[MongoDB] Connected successfully.");
        return instance;
      });
  }

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    cached.connection = null;
    cached.promise = null;

    console.error("[MongoDB] Connection failed:", error);
    throw error;
  }
}