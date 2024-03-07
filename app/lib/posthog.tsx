import { useLocation } from "@remix-run/react";
import { useEffect } from "react";
import { User } from "@prisma/client";
import { posthog } from "posthog-js";

export function usePosthog(props: { user: User | null }) {
  const location = useLocation();
  const [clientSetup, setClientSetup] = useState(false);

  useEffect(() => {
    if (!clientSetup) {
      posthog.init("phc_xSfqRtKRSoH5A9kPcNkI7J2HNakfQ5KRhFiwVujq8WL", {
        api_host: "https://app.posthog.com",
      });

      setClientSetup(true);
    }

    if (props.user) {
      posthog.identify(props.user.id, {
        name: props.user.name,
      });
    }
  }, [props.user]);

  useEffect(() => {
    posthog.capture("$pageview");
  }, [location]);
}