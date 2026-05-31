import { IconContext } from "react-icons";
import { FaCircleNotch } from "react-icons/fa6";

export function SpinningIcon() {
  return (
    <IconContext.Provider value={{ className: "animate-spin" }}>
      <FaCircleNotch />
    </IconContext.Provider>
  );
}
