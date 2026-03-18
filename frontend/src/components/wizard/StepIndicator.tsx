import { STEP_TITLES } from "@/types/nda";

interface StepIndicatorProps {
  currentStep: number; // 0-indexed
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {STEP_TITLES.map((title, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          // The connector between step N and step N+1 should be blue only
          // when step N is completed — we derive this from the right-side
          // perspective (i.e., the connector BEFORE the current circle).
          const leftConnectorFilled = index > 0 && index <= currentStep;

          return (
            <li key={title} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={`flex-1 h-0.5 transition-colors ${
                      leftConnectorFilled ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                    isCompleted
                      ? "bg-blue-600 text-white"
                      : isCurrent
                      ? "bg-blue-100 text-blue-700 ring-2 ring-blue-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEP_TITLES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 transition-colors ${
                      isCompleted ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block text-center ${
                  isCurrent ? "text-blue-700" : isCompleted ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {title}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
