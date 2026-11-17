import { subpageRoute } from "../subpage";

const route = subpageRoute("prices");
export const generateMetadata = route.generateMetadata;
export default route.Page;
