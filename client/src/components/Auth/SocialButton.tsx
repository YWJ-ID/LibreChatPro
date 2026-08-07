import React, { useCallback } from 'react';

function SocialButton({ id, enabled, serverDomain, oauthPath, Icon, label }) {
  const handleClick = useCallback(() => {
    const flowId = crypto.randomUUID();
    const popup = window.open(
      `${serverDomain}/oauth/${oauthPath}?flowId=${encodeURIComponent(flowId)}`,
      'librechat-oauth',
      'popup,width=520,height=700,resizable=yes,scrollbars=yes',
    );

    if (!popup) {
      window.location.href = `${serverDomain}/oauth/${oauthPath}`;
    }
  }, [oauthPath, serverDomain]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="mt-2 flex gap-x-2">
      <a
        aria-label={`${label}`}
        className="flex w-full items-center space-x-3 rounded-2xl border border-border-light bg-surface-primary px-5 py-3 text-text-primary transition-colors duration-200 hover:bg-surface-tertiary"
        href={`${serverDomain}/oauth/${oauthPath}`}
        onClick={(event) => {
          event.preventDefault();
          handleClick();
        }}
        data-testid={id}
      >
        <Icon />
        <p>{label}</p>
      </a>
    </div>
  );
}

export default SocialButton;
