// src/services/index.ts
// Service factory - switches between Firebase and REST implementations

import { VotesService } from './api/votes.api';
import { PredictionsService } from './api/predictions.api';
import { FirebaseVotesService } from './implementations/firebase/votes.firebase';
import { FirebasePredictionsService } from './implementations/firebase/predictions.firebase';

// Configuration - switch between Firebase and REST
const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE !== 'false';

// Export service instances
export const votesService: VotesService = USE_FIREBASE
  ? new FirebaseVotesService()
  : null as any; // REST implementation will be added later

export const predictionsService: PredictionsService = USE_FIREBASE
  ? new FirebasePredictionsService()
  : null as any; // REST implementation will be added later

// Export types for convenience
export type { VotesService, Vote } from './api/votes.api';
export type { PredictionsService, Prediction, PredictionFilters } from './api/predictions.api';
