import nextTs from 'eslint-config-next/typescript';
import nextVitals from 'eslint-config-next/core-web-vitals';

const nextFrameworkConfig = [...nextVitals, ...nextTs];

export default nextFrameworkConfig;
