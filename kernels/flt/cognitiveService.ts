export type CognitiveInput = {
  historic_iq_estimate?: number;
  norm_year?: number;
};

export type CognitiveOutput = {
  modern_iq?: number;
  percentile?: number;
  iq_ci_range?: [number, number];
  band?: "high" | "above_average" | "average" | "below_average" | "developing";
};

const FLYNN_ADJUST_PPD = 3.0;
const IQ_CI = 5;

export function runCognitive(input: CognitiveInput, currentYear: number): CognitiveOutput {
  if (!input.historic_iq_estimate || !input.norm_year) return {};

  const decades = Math.floor((currentYear - input.norm_year) / 10);
  const modern = input.historic_iq_estimate - FLYNN_ADJUST_PPD * decades;
  const z = (modern - 100) / 15;
  const percentile = Math.round(phi(z) * 100);

  return {
    modern_iq: modern,
    percentile,
    iq_ci_range: [modern - IQ_CI, modern + IQ_CI],
    band: bandFromPercentile(percentile)
  };
}

function phi(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * Math.abs(x));
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
      Math.exp(-x * x);
  return sign * y;
}

function bandFromPercentile(p: number) {
  if (p >= 84) return "high";
  if (p >= 70) return "above_average";
  if (p >= 30) return "average";
  if (p >= 16) return "below_average";
  return "developing";
}
