/* eslint-disable react/prop-types */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import summaryApi from "../common/summaryApi";
import Axios from "../utils/Axios";

const AddressContext = createContext();

export const AddressProvider = ({ children }) => {
    const userId = useSelector((state) => String(state.user?._id || ""));
    const [addresses, setAddresses] = useState([]);
    const [isAddressLoading, setIsAddressLoading] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState("");
    const userIdRef = useRef(userId);
    const requestSequenceRef = useRef(0);
    const inFlightRef = useRef(null);
    userIdRef.current = userId;

    const fetchAddress = useCallback(async ({ force = true } = {}) => {
        const owner = userIdRef.current;
        if (!owner) {
            setAddresses([]);
            setIsAddressLoading(false);
            return [];
        }
        if (!force && inFlightRef.current?.owner === owner) return inFlightRef.current.promise;

        const sequence = ++requestSequenceRef.current;
        setIsAddressLoading(true);
        const request = Axios({ ...summaryApi.getAddress })
            .then((response) => {
                const result = response.data?.success ? response.data.data || [] : [];
                if (owner === userIdRef.current && sequence === requestSequenceRef.current) {
                    setAddresses([...result].sort((left, right) => Number(Boolean(right.defaultAddress)) - Number(Boolean(left.defaultAddress))));
                    setLoadedUserId(owner);
                }
                return result;
            })
            .catch((error) => {
                if (error.response?.status !== 404) console.log(error);
                if (owner === userIdRef.current && sequence === requestSequenceRef.current) {
                    setAddresses([]);
                    setLoadedUserId(owner);
                }
                return [];
            })
            .finally(() => {
                if (owner === userIdRef.current && sequence === requestSequenceRef.current) setIsAddressLoading(false);
                if (inFlightRef.current?.promise === request) inFlightRef.current = null;
            });
        inFlightRef.current = { owner, promise: request };
        return request;
    }, []);

    useEffect(() => {
        requestSequenceRef.current += 1;
        inFlightRef.current = null;
        setAddresses([]);
        setLoadedUserId("");
        if (!userId) {
            setIsAddressLoading(false);
            return;
        }
        fetchAddress({ force: false });
    }, [userId, fetchAddress]);

    const currentUserAddresses = loadedUserId === userId ? addresses : [];
    return (
        <AddressContext.Provider value={{ addresses: currentUserAddresses, fetchAddress, isAddressLoading: isAddressLoading || Boolean(userId && loadedUserId !== userId) }}>
            {children}
        </AddressContext.Provider>
    );
};

export const useAddress = () => useContext(AddressContext);
