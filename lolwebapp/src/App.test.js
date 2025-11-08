import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders splash logo", () => {
  render(<App />);
  const logo = screen.getByAltText(/League of Legends logo/i);
  expect(logo).toBeInTheDocument();
});
