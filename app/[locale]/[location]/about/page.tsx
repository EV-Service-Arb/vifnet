import { subpageRoute } from "../subpage";

const route = subpageRoute("about");
export const generateMetadata = route.generateMetadata;
export default route.Page;
