"use client";

import { useState } from "react";
import { CourierStep } from "./CourierStep";
import { TrackingStep } from "./TrackingStep";

export function ConverterApp() {
  const [step, setStep] = useState<"courier" | "tracking">("courier");

  return (
    <main>
      <div className="step-switch">
        <button
          type="button"
          className={step === "courier" ? "is-active" : undefined}
          onClick={() => setStep("courier")}
        >
          1단계: 주문 → 택배 양식
        </button>
        <button
          type="button"
          className={step === "tracking" ? "is-active" : undefined}
          onClick={() => setStep("tracking")}
        >
          2단계: 운송장 → EMP 매출장부
        </button>
      </div>
      {step === "courier" ? <CourierStep /> : <TrackingStep />}
    </main>
  );
}
