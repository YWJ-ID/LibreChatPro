import React from 'react';

function AlipayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Alipay"
    >
      <circle cx="12" cy="12" r="12" fill="#1677FF" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="white"
        fontSize="13"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        支
      </text>
    </svg>
  );
}

export default React.memo(AlipayIcon);