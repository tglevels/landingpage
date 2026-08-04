import mongoose, {
  Schema,
  Document,
  Types,
} from 'mongoose';

export interface ITouchpoint {
  _id?: Types.ObjectId;

  touchpointKey: string;

  platform: string;
  formSource: string;
  sourceType: string;

  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  utmId: string;

  gclid: string;
  fbclid: string;

  landingPage: {
    url: string;
    path: string;
  };

  referrer: string;

  userAgent: string;
  ipAddress: string;
  language: string;
  timezone: string;

  browser: {
    name: string;
    version: string;
  };

  os: {
    name: string;
    version: string;
  };

  device: {
    type: string;
    vendor: string;
    model: string;
  };

  channel: string;
  videoId: string;
  videoTitle: string;
  placement: string;

  journeyId: string;
  parentTouchpointId: string;

  capturedAt: Date;
}

export interface ISubmission
  extends Document {
  fullName: string;
  phone: string;

  touchpoints: ITouchpoint[];

  firstTouchAt: Date;
  lastTouchAt: Date;

  totalTouchpoints: number;

  createdAt: Date;
  updatedAt: Date;
}

const TouchpointSchema =
  new Schema<ITouchpoint>(
    {
      touchpointKey: {
        type: String,
        required: true,
        trim: true,
      },

      platform: {
        type: String,
        default: 'Direct',
        trim: true,
      },

      formSource: {
        type: String,
        default: '',
        trim: true,
      },

      sourceType: {
        type: String,
        default: 'landing_page',
        trim: true,
      },

      utmSource: {
        type: String,
        default: '',
        trim: true,
      },

      utmMedium: {
        type: String,
        default: '',
        trim: true,
      },

      utmCampaign: {
        type: String,
        default: '',
        trim: true,
      },

      utmContent: {
        type: String,
        default: '',
        trim: true,
      },

      utmTerm: {
        type: String,
        default: '',
        trim: true,
      },

      utmId: {
        type: String,
        default: '',
        trim: true,
      },

      gclid: {
        type: String,
        default: '',
        trim: true,
      },

      fbclid: {
        type: String,
        default: '',
        trim: true,
      },

      landingPage: {
        url: {
          type: String,
          default: '',
          trim: true,
        },

        path: {
          type: String,
          default: '/',
          trim: true,
        },
      },

      referrer: {
        type: String,
        default: '',
        trim: true,
      },

      userAgent: {
        type: String,
        default: '',
      },

      ipAddress: {
        type: String,
        default: '',
        trim: true,
      },

      language: {
        type: String,
        default: '',
        trim: true,
      },

      timezone: {
        type: String,
        default: '',
        trim: true,
      },

      browser: {
        name: {
          type: String,
          default: '',
          trim: true,
        },

        version: {
          type: String,
          default: '',
          trim: true,
        },
      },

      os: {
        name: {
          type: String,
          default: '',
          trim: true,
        },

        version: {
          type: String,
          default: '',
          trim: true,
        },
      },

      device: {
        type: {
          type: String,
          default: 'unknown',
          trim: true,
        },

        vendor: {
          type: String,
          default: '',
          trim: true,
        },

        model: {
          type: String,
          default: '',
          trim: true,
        },
      },

      channel: {
        type: String,
        default: '',
        trim: true,
      },

      videoId: {
        type: String,
        default: '',
        trim: true,
      },

      videoTitle: {
        type: String,
        default: '',
        trim: true,
      },

      placement: {
        type: String,
        default: '',
        trim: true,
      },

      journeyId: {
        type: String,
        default: '',
        trim: true,
      },

      parentTouchpointId: {
        type: String,
        default: '',
        trim: true,
      },

      capturedAt: {
        type: Date,
        default: Date.now,
        required: true,
      },
    },
    {
      _id: true,
    }
  );

const SubmissionSchema =
  new Schema<ISubmission>(
    {
      fullName: {
        type: String,
        default: '',
        trim: true,
      },

      phone: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      touchpoints: {
        type: [TouchpointSchema],
        default: [],
      },

      firstTouchAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      lastTouchAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      totalTouchpoints: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
    }
  );

SubmissionSchema.index({
  'touchpoints.touchpointKey': 1,
});

SubmissionSchema.index({
  'touchpoints.platform': 1,
});

SubmissionSchema.index({
  'touchpoints.utmSource': 1,
});

SubmissionSchema.index({
  'touchpoints.utmCampaign': 1,
});

SubmissionSchema.index({
  'touchpoints.utmId': 1,
});

SubmissionSchema.index({
  'touchpoints.formSource': 1,
});

SubmissionSchema.index({
  'touchpoints.sourceType': 1,
});

SubmissionSchema.index({
  'touchpoints.capturedAt': -1,
});

SubmissionSchema.index({
  firstTouchAt: -1,
});

SubmissionSchema.index({
  lastTouchAt: -1,
});

const Submission =
  mongoose.models.Submission ||
  mongoose.model<ISubmission>(
    'Submission',
    SubmissionSchema
  );

export default Submission;