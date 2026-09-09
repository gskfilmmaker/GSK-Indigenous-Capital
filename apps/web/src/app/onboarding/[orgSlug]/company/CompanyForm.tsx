"use client";

import { useActionState, useId, useState } from "react";
import { createCompanyAction, type CompanyOnboardingActionState } from "./actions";
import styles from "../../onboarding.module.css";

const INITIAL_STATE: CompanyOnboardingActionState = {};

const INCORPORATION_STATUTE_LABELS = {
  UNKNOWN: "Not sure yet",
  OBCA: "Ontario Business Corporations Act (OBCA)",
  CBCA: "Canada Business Corporations Act (CBCA)",
  OTHER: "Other",
} as const;

function AddressFields({ prefix, legend }: { prefix: string; legend: string }) {
  const line1Id = useId();
  const line2Id = useId();
  const cityId = useId();
  const provinceId = useId();
  const postalCodeId = useId();
  const countryId = useId();

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.grid}>
        <div className={styles.fieldWide}>
          <label htmlFor={line1Id} className={styles.label}>
            Address line 1
          </label>
          <input id={line1Id} name={`${prefix}Line1`} type="text" className={styles.input} />
        </div>
        <div className={styles.fieldWide}>
          <label htmlFor={line2Id} className={styles.label}>
            Address line 2
          </label>
          <input id={line2Id} name={`${prefix}Line2`} type="text" className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor={cityId} className={styles.label}>
            City
          </label>
          <input id={cityId} name={`${prefix}City`} type="text" className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor={provinceId} className={styles.label}>
            Province or territory
          </label>
          <input
            id={provinceId}
            name={`${prefix}ProvinceOrTerritory`}
            type="text"
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={postalCodeId} className={styles.label}>
            Postal code
          </label>
          <input
            id={postalCodeId}
            name={`${prefix}PostalCode`}
            type="text"
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={countryId} className={styles.label}>
            Country
          </label>
          <input id={countryId} name={`${prefix}Country`} type="text" className={styles.input} />
        </div>
      </div>
    </fieldset>
  );
}

export function CompanyForm({
  orgSlug,
  idempotencyKey,
}: {
  orgSlug: string;
  idempotencyKey: string;
}) {
  const [state, formAction, isPending] = useActionState(createCompanyAction, INITIAL_STATE);
  const [incorporationStatute, setIncorporationStatute] = useState<string>("UNKNOWN");
  const [sameAsRegistered, setSameAsRegistered] = useState(false);

  const legalNameId = useId();
  const operatingNameId = useId();
  const statuteId = useId();
  const statuteOtherId = useId();
  const corporationNumberId = useId();
  const incorporationDateId = useId();

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className={styles.field}>
        <label htmlFor={legalNameId} className={styles.label}>
          Legal company name
        </label>
        <input id={legalNameId} name="legalName" type="text" required className={styles.input} />
      </div>

      <div className={styles.field}>
        <label htmlFor={operatingNameId} className={styles.label}>
          Operating name (optional)
        </label>
        <input id={operatingNameId} name="operatingName" type="text" className={styles.input} />
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor={statuteId} className={styles.label}>
            Incorporation statute
          </label>
          <select
            id={statuteId}
            name="incorporationStatute"
            className={styles.select}
            value={incorporationStatute}
            onChange={(event) => setIncorporationStatute(event.target.value)}
          >
            {Object.entries(INCORPORATION_STATUTE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {incorporationStatute === "OTHER" ? (
          <div className={styles.field}>
            <label htmlFor={statuteOtherId} className={styles.label}>
              Statute name
            </label>
            <input
              id={statuteOtherId}
              name="incorporationStatuteOther"
              type="text"
              required
              className={styles.input}
            />
          </div>
        ) : null}
        <div className={styles.field}>
          <label htmlFor={corporationNumberId} className={styles.label}>
            Corporation number (optional)
          </label>
          <input
            id={corporationNumberId}
            name="corporationNumber"
            type="text"
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={incorporationDateId} className={styles.label}>
            Incorporation date (optional)
          </label>
          <input
            id={incorporationDateId}
            name="incorporationDate"
            type="date"
            className={styles.input}
          />
        </div>
      </div>

      <p className={styles.hint}>
        If your statute or incorporation date isn't known yet, leave it — you can continue and add
        it later. Final legal-document generation stays blocked until it's on file.
      </p>

      <AddressFields prefix="registered" legend="Registered address (optional)" />

      <div className={styles.checkboxRow}>
        <input
          id="sameAsRegistered"
          name="sameAsRegistered"
          type="checkbox"
          checked={sameAsRegistered}
          onChange={(event) => setSameAsRegistered(event.target.checked)}
        />
        <label htmlFor="sameAsRegistered">
          Head office address is the same as registered address
        </label>
      </div>
      {sameAsRegistered ? null : (
        <AddressFields prefix="headOffice" legend="Head office address (optional)" />
      )}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Governing documents on file (optional)</legend>
        <p className={styles.hint}>
          This only records that a review is needed before drafting — it doesn't describe what those
          documents say.
        </p>
        {(
          [
            ["hasShareholderAgreement", "Shareholder agreement"],
            ["hasUnanimousShareholderAgreement", "Unanimous shareholder agreement"],
            ["hasInvestorRightsAgreement", "Investor rights agreement"],
            ["hasDebtCovenant", "Debt covenant"],
            ["hasReservedMatters", "Reserved matters"],
          ] as const
        ).map(([name, label]) => (
          <div className={styles.checkboxRow} key={name}>
            <input id={name} name={name} type="checkbox" />
            <label htmlFor={name}>{label}</label>
          </div>
        ))}
      </fieldset>

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? "Saving…" : "Finish setup"}
      </button>
    </form>
  );
}
