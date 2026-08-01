import "./globals.css";
import ActivityBar from "../components/ActivityBar";

export const metadata = {
  title: "DSA Visualized",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%233b82f6' d='M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C7.58 2 4 5.58 4 10c0 2.92 1.56 5.44 3.88 6.83.42.25.62.71.62 1.17H15.5c0-.46.2-.92.62-1.17C18.44 15.44 20 12.92 20 10c0-4.42-3.58-8-8-8z'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ActivityBar />
        {children}
      </body>
    </html>
  );
}
