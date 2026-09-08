import { UnsupportedCaseError } from "./errors.js";

export interface SequencedInstrument {
  id: string;
  sequence: number;
}

/**
 * Spec §7.7: MFN order is chronological and material — "An MFN may
 * consider eligible economic terms issued later, not earlier." This
 * computes the set of instruments eligible as MFN candidates by
 * chronological sequence alone (spec §8 test 10: moving a later cap SAFE
 * before an MFN removes it from the candidate set).
 *
 * This does not perform the MFN election/conversion itself — that is
 * priced-round-dependent and deferred (spec §7.7: "the model does not
 * perform a legal MFN election").
 */
export function eligibleMfnCandidates<T extends SequencedInstrument>(
  instruments: T[],
  mfnInstrumentId: string,
): T[] {
  const mfnInstrument = instruments.find((instrument) => instrument.id === mfnInstrumentId);
  if (!mfnInstrument) {
    throw new UnsupportedCaseError(
      "mfn_instrument_not_found",
      `no instrument with id ${mfnInstrumentId} found in the supplied list`,
    );
  }
  return instruments.filter(
    (instrument) =>
      instrument.id !== mfnInstrumentId && instrument.sequence > mfnInstrument.sequence,
  );
}
