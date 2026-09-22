"use client";

import { useState } from "react";
import { CourierStep } from "./CourierStep";
import { TrackingStep } from "./TrackingStep";

export function ConverterApp() {
  const [step, setStep] = useState<"courier" | "tracking">("courier");

  return (
    <main>
      <div className="step-switch" role="radiogroup" aria-label="작업 선택">
        <button
          type="button"
          role="radio"
          aria-checked={step === "courier"}
          onClick={() => setStep("courier")}
        >
          1단계: 주문 → 택배 양식
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={step === "tracking"}
          onClick={() => setStep("tracking")}
        >
          2단계: 운송장 → EMP 매출장부
        </button>
      </div>
      {step === "courier" ? <CourierStep /> : <TrackingStep />}
    </main>
  );
}
