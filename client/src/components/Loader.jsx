import React from 'react';

const Loader = ({ fullScreen = false }) => {
  const loaderElement = <div className="loader"></div>;

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white animate-fade-in">
        {loaderElement}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full min-h-[50vh]">
      {loaderElement}
    </div>
  );
};

export default Loader;
