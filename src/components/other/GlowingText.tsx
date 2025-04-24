import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0%, 100% {
    background-position: -100% 0;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.1),
                 0 0 10px rgba(255, 255, 255, 0.1),
                 0 0 15px rgba(255, 255, 255, 0.1),
                 0 0 20px rgba(255, 255, 255, 0.1);
  }
  50% {
    background-position: 200% 0;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.2),
                 0 0 20px rgba(255, 255, 255, 0.2),
                 0 0 30px rgba(255, 255, 255, 0.2),
                 0 0 40px rgba(255, 255, 255, 0.2);
  }
`;

const GlowingText = styled.p`
    color: #f0f0f0; // Off-white color
    font-family: 'Nostromo', sans-serif; // Make sure to import or define this font
    font-size: 15px;
    font-weight: normal;
    text-align: center;
    margin-top: 15px;
    margin-bottom: 16px; // Equivalent to mb={4} in most design systems
    background: linear-gradient(
        to right,
        rgba(255, 255, 255, 0.8) 0%,
        rgba(255, 255, 255, 1) 50%,
        rgba(255, 255, 255, 0.8) 100%
    );
    background-size: 50% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: ${shimmer} 8s ease-in-out infinite;
`;

// Default props in case no text is provided
const GlowingShimmerText = ({
    text = 'The Rift early alpha is awaiting audits - swaps are limited to 100 USDT - use at your own risk',
}) => <GlowingText>{text}</GlowingText>;

export default GlowingShimmerText;
