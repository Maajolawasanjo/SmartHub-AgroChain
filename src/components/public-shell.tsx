import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
export function PublicShell({children}:{children:React.ReactNode}){
 return <><a className="public-skip-link" href="#main-content">Skip to content</a><SiteHeader/><main id="main-content" tabIndex={-1}>{children}</main><SiteFooter/></>;
}
