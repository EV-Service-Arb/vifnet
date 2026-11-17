import { subpageRoute } from "../subpage";

const route = subpageRoute("guarantee");
export const generateMetadata = route.generateMetadata;
export default route.Page;
