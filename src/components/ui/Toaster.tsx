"use client";

import * as Toast from "@radix-ui/react-toast";

export function Toaster() {
  return (
    <Toast.Provider>
      <Toast.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" />
    </Toast.Provider>
  );
}
