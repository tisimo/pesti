import React from "react";

interface PageLoadingStateProps {
  message?: string;
  className?: string;
  "data-testid"?: string;
}

const PageLoadingState: React.FC<PageLoadingStateProps> = ({
  message = "Loading...",
  className = "",
  "data-testid": dataTestId = "page-loading-state",
}) => {
  return (
    <div
      className={`container py-5 text-center text-muted ${className}`.trim()}
      data-testid={dataTestId}
    >
      <i className="fas fa-spinner fa-spin fa-2x mb-3" data-testid={`${dataTestId}-icon`}></i>
      <p className="mb-0" data-testid={`${dataTestId}-message`}>
        {message}
      </p>
    </div>
  );
};

export default React.memo(PageLoadingState);
