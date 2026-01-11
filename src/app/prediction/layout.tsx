import { Metadata } from 'next';

// This is a simple layout - metadata will be handled by the API route
export const metadata: Metadata = {
  title: 'Prediction - TruthVote',
  description: 'Make your prediction on TruthVote',
};

export default function PredictionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
