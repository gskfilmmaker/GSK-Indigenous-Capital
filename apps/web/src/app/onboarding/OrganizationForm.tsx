"use client";

import { slugify } from "@gsk/domain";
import { useActionState, useId, useState } from "react";
import { createOrganizationAction, type OnboardingActionState } from "./actions";
import styles from "./onboarding.module.css";

const INITIAL_STATE: OnboardingActionState = {};

export function OrganizationForm() {
  const [state, formAction, isPending] = useActionState(createOrganizationAction, INITIAL_STATE);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditedByHand, setSlugEditedByHand] = useState(false);
  const nameId = useId();
  const slugId = useId();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEditedByHand) {
      setSlug(slugify(value));
    }
  }

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <div className={styles.field}>
        <label htmlFor={nameId} className={styles.label}>
          Organization name
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          required
          className={styles.input}
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={slugId} className={styles.label}>
          Organization URL
        </label>
        <input
          id={slugId}
          name="slug"
          type="text"
          required
          className={styles.input}
          value={slug}
          onChange={(event) => {
            setSlugEditedByHand(true);
            setSlug(event.target.value);
          }}
          aria-describedby={`${slugId}-hint`}
        />
        <p id={`${slugId}-hint`} className={styles.hint}>
          Your workspace will be at /app/{slug || "your-organization"}
        </p>
      </div>

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? "Creating…" : "Continue"}
      </button>
    </form>
  );
}
