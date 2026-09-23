import React, { useEffect, memo } from 'react';
import TagManager from 'react-gtm-module';
import ReactMarkdown from 'react-markdown';
import { useGetStartupConfig } from '~/data-provider';
import { useLocalize } from '~/hooks';

const COPYRIGHT = 'Copyright © 2026 星河映颜（广州）科技有限公司 All Rights Reserved.';
const ICP_NUMBER = '粤ICP备2026104863号';
const ICP_URL = 'https://beian.miit.gov.cn/';
const POLICE_NUMBER = '粤公网安备44011502001757号';
const POLICE_URL = 'https://beian.mps.gov.cn/#/query/webSearch?code=44011502001757';
const POLICE_ICON = 'https://beian.mps.gov.cn/img/logo01.dd7ff50e.png';

function Footer({ className }: { className?: string }) {
  const { data: config } = useGetStartupConfig();
  const localize = useLocalize();

  const privacyPolicy = config?.interface?.privacyPolicy;
  const termsOfService = config?.interface?.termsOfService;

  const privacyPolicyRender = privacyPolicy?.externalUrl != null && (
    <a className="text-text-secondary underline" href={privacyPolicy.externalUrl} rel="noreferrer">
      {localize('com_ui_privacy_policy')}
    </a>
  );

  const termsOfServiceRender = termsOfService?.externalUrl != null && (
    <a className="text-text-secondary underline" href={termsOfService.externalUrl} rel="noreferrer">
      {localize('com_ui_terms_of_service')}
    </a>
  );

  useEffect(() => {
    if (config?.analyticsGtmId != null && typeof window.google_tag_manager === 'undefined') {
      const tagManagerArgs = {
        gtmId: config.analyticsGtmId,
      };
      TagManager.initialize(tagManagerArgs);
    }
  }, [config?.analyticsGtmId]);

  const customFooter = config?.customFooter;

  const mainContentRender =
    typeof customFooter === 'string' && customFooter.trim().length > 0
      ? customFooter.split('|').map((text, index) => (
          <React.Fragment key={`main-content-part-${index}`}>
            <ReactMarkdown
              components={{
                a: ({ node: _n, href, children, ...otherProps }) => {
                  return (
                    <a
                      className="text-text-secondary underline"
                      href={href}
                      rel="noreferrer"
                      {...otherProps}
                    >
                      {children}
                    </a>
                  );
                },

                p: ({ node: _n, ...props }) => <span {...props} />,
              }}
            >
              {text.trim()}
            </ReactMarkdown>
          </React.Fragment>
        ))
      : [
          <span key="copyright" className="text-text-secondary">
            {COPYRIGHT}
          </span>,
          <a
            key="icp"
            className="text-text-secondary hover:underline"
            href={ICP_URL}
            rel="noreferrer"
            target="_blank"
          >
            {ICP_NUMBER}
          </a>,
          <a
            key="police-record"
            className="inline-flex items-center gap-1 text-text-secondary hover:underline"
            href={POLICE_URL}
            rel="noreferrer"
            target="_blank"
          >
            <img src={POLICE_ICON} alt="公网安备" className="h-3.5 w-3.5" />
            {POLICE_NUMBER}
          </a>,
        ];

  const footerElements = [...mainContentRender, privacyPolicyRender, termsOfServiceRender].filter(
    Boolean,
  );

  return (
    <div className="relative w-full">
      <div
        className={
          className ??
          'absolute bottom-0 left-0 right-0 hidden items-center justify-center gap-2 px-2 py-2 text-center text-xs text-text-primary sm:flex md:px-[60px]'
        }
        role="contentinfo"
      >
        {footerElements.map((contentRender, index) => {
          const isLastElement = index === footerElements.length - 1;
          return (
            <React.Fragment key={`footer-element-${index}`}>
              {contentRender}
              {!isLastElement && (
                <div
                  key={`separator-${index}`}
                  className="h-2 border-r-[1px] border-border-medium"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

const MemoizedFooter = memo(Footer);
MemoizedFooter.displayName = 'Footer';

export default MemoizedFooter;
