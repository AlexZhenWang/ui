/// <reference types="react" />
declare const _default: <P extends import("react-i18next").WithTranslation>(component: import("react").ComponentType<P>) => import("react").ComponentType<Pick<P, Exclude<keyof P, "t" | "i18n" | "tReady">> & import("react-i18next").WithTranslationProps>;
export default _default;
