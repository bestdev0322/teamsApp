import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';


// Ensure width is a string
const RoundChart = ({ data, title, colors, height = 350, width = '500px', marginTop = 0 }) => {
    const widthStr = typeof width === 'number' ? `${width}px` : width;
    
    // Check if all values are 0
    const allValuesZero = data.every(item => item.value === 0);
    
    return (
        <Box sx={{ width: widthStr, height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mt: marginTop }}>
            {title && <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>}
            <Box sx={{ width: '100%', height: height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {allValuesZero ? (
                    <svg width={304} height={height} style={{ display: 'block', margin: '0 auto' }}>
                        <circle 
                            cx={"50%"} 
                            cy={"50%"} 
                            r={150} 
                            fill="none" 
                            stroke="#bbb" 
                            strokeWidth={4} 
                        />
                    </svg>
                ) : (
                    <ResponsiveContainer width="100%" height={height}>
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx={"50%"}
                                cy={"50%"}
                                outerRadius={150}
                            >
                                {data.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={colors[entry.name]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value, name, props) => [`${value} (${props.payload.percent}%)`, name]} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </Box>
            {/* Always show the legend below */}
            {allValuesZero && (
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
                    {data.map((entry, idx) => (
                        <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', mx: 2 }}>
                            <Box sx={{ width: 16, height: 16, bgcolor: colors[entry.name], borderRadius: '50%', mr: 1 }} />
                            <Typography variant="body2">{entry.name}</Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default RoundChart;
