export default function Card({ title, children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}
