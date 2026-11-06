import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, HTMLAttributes, ReactNode } from "react";

type ActionVariant="primary"|"secondary"|"quiet";
type ActionStyle={variant?:ActionVariant;fullWidth?:boolean;className?:string};
const buttonClasses=({variant="primary",fullWidth=false,className=""}:ActionStyle)=>
 ["sh-button","sh-button--"+variant,fullWidth?"sh-button--full":"",className].filter(Boolean).join(" ");

type BrandLinkProps=Omit<ComponentProps<typeof Link>,"className"> & ActionStyle;
export function BrandLink({variant="primary",fullWidth=false,className="",children,...props}:BrandLinkProps) {
 return <Link {...props} className={buttonClasses({variant,fullWidth,className})}>{children}</Link>;
}

type BrandButtonProps=ButtonHTMLAttributes<HTMLButtonElement> & ActionStyle;
export function BrandButton({variant="primary",fullWidth=false,className="",children,type="button",...props}:BrandButtonProps) {
 return <button {...props} type={type} className={buttonClasses({variant,fullWidth,className})}>{children}</button>;
}

type CardProps=HTMLAttributes<HTMLElement> & {tone?:"white"|"sage";flat?:boolean};
export function BrandCard({tone="white",flat=false,className="",children,...props}:CardProps) {
 return <article {...props} className={["sh-card",tone==="sage"?"sh-card--sage":"",flat?"sh-card--flat":"",className].filter(Boolean).join(" ")}>{children}</article>;
}

type BadgeProps=HTMLAttributes<HTMLSpanElement> & {tone?:"sage"|"gold"|"outline"};
export function BrandBadge({tone="sage",className="",children,...props}:BadgeProps){
 return <span {...props} className={["sh-badge",tone!=="sage"?"sh-badge--"+tone:"",className].filter(Boolean).join(" ")}>{children}</span>;
}

export function BrandField({label,htmlFor,hint,children,className=""}:{label:ReactNode;htmlFor:string;hint?:ReactNode;children:ReactNode;className?:string}){
 return <div className={["sh-field",className].filter(Boolean).join(" ")}>
  <label className="sh-label" htmlFor={htmlFor}>{label}</label>{children}{hint&&<span className="sh-hint">{hint}</span>}
 </div>;
}
