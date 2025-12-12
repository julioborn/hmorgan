"use client";

export default function SwipeBackZone() {
    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "24px",
                height: "100vh",
                zIndex: 9999,
                background: "transparent",
            }}
        />
    );
}
