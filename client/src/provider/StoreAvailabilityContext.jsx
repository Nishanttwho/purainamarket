import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

const StoreAvailabilityContext = createContext({ availability: null, refreshAvailability: async () => {} });

export function StoreAvailabilityProvider({ children }) { // eslint-disable-line react/prop-types
    const [availability, setAvailability] = useState(null);
    const refreshAvailability = useCallback(async () => {
        try {
            const response = await Axios(summaryApi.getStoreStatus);
            if (response.data?.success) setAvailability(response.data.data);
        } catch {
            setAvailability({ isOpen: false, reason: "status-unavailable", message: "Store availability could not be checked. Please try again." });
        }
    }, []);

    useEffect(() => {
        refreshAvailability();
        const timer = window.setInterval(refreshAvailability, 30000);
        window.addEventListener("focus", refreshAvailability);
        return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshAvailability); };
    }, [refreshAvailability]);

    return <StoreAvailabilityContext.Provider value={{ availability, refreshAvailability }}>{children}</StoreAvailabilityContext.Provider>;
}

export const useStoreAvailability = () => useContext(StoreAvailabilityContext);
