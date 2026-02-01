'use client';

import { Box, Typography, Button } from '@mui/material';
import Image from 'next/image';
import SafeECharts from '@/components/common/SafeECharts';
import type { EChartsOption } from 'echarts';
import { ArrowDropDown } from '@mui/icons-material';

export default function LoginRightPanel() {
  // Employee Distribution Donut Chart Configuration (3D)
  const employeeDistributionOption: EChartsOption = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      show: false,
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          label: {
            show: false,
          },
          scale: true,
          scaleSize: 5,
        },
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          shadowOffsetX: 0,
          shadowOffsetY: 5,
        },
        data: [
          {
            value: 156,
            name: 'المشاريع',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#1043a3' },
                  { offset: 1, color: '#0c2b7a' }
                ],
              }
            }
          },
          {
            value: 48,
            name: 'الموارد البشرية',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#34d399' },
                  { offset: 1, color: '#10b981' }
                ],
              }
            }
          },
          {
            value: 28,
            name: 'المالية',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#ef4444' },
                  { offset: 1, color: '#dc2626' }
                ],
              }
            }
          },
          {
            value: 16,
            name: 'المستودعات',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#a78bfa' },
                  { offset: 1, color: '#8b5cf6' }
                ],
              }
            }
          },
        ],
      },
    ],
  };

  // Monthly Payroll Bar Chart Configuration (3D)
  const monthlyPayrollOption: EChartsOption = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(12, 43, 122, 0.1)',
        },
      },
      formatter: '{b}<br/>{a0}: {c0}K SAR',
    },
    legend: {
      data: ['كشف الرواتب'],
      bottom: 0,
      textStyle: {
        fontSize: 8,
        color: '#6B7280',
      },
      itemWidth: 10,
      itemHeight: 6,
    },
    grid: {
      left: '12%',
      right: '8%',
      top: '8%',
      bottom: '15%',
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
      axisLabel: {
        fontSize: 8,
        color: '#9CA3AF',
      },
      axisLine: {
        lineStyle: {
          color: '#E5E7EB',
        },
      },
    },
    yAxis: {
      type: 'value',
      max: 300,
      axisLabel: {
        fontSize: 8,
        color: '#9CA3AF',
        formatter: '{value}K',
      },
      splitLine: {
        lineStyle: {
          color: '#F3F4F6',
        },
      },
    },
    series: [
      {
        name: 'كشف الرواتب',
        type: 'bar',
        data: [245, 258, 252, 268, 262, 275],
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            // Alternate between blue and red to match Techno logo colors
            const index = params.dataIndex;
            if (index % 2 === 0) {
              // Blue bars (even indices)
              return {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#1043a3' },
                  { offset: 0.5, color: '#0c2b7a' },
                  { offset: 1, color: '#0a2461' }
                ],
              };
            } else {
              // Red bars (odd indices) to match Techno logo
              return {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#ef4444' },
                  { offset: 0.5, color: '#dc2626' },
                  { offset: 1, color: '#b91c1c' }
                ],
              };
            }
          },
          borderRadius: [6, 6, 0, 0],
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          shadowOffsetX: 0,
          shadowOffsetY: 3,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 15,
            shadowColor: 'rgba(0, 0, 0, 0.4)',
            shadowOffsetY: 5,
          },
        },
        barWidth: '50%',
      },
    ],
  };

  return (
    <Box
      sx={{
        flex: 1,
        position: 'relative',
        minHeight: { xs: '300px', md: 'auto' },
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: { xs: 0, md: '0 24px 24px 0' },
        padding: 3,
        overflow: 'hidden',
        animation: 'fadeIn 0.6s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      {/* Background Image */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
      >
        <Image
          src="/assets/background-image-login-right.png"
          alt="خلفية"
          fill
          priority
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </Box>

      {/* Content Container */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '450px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Cards Container */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            mb: 1.5,
          }}
        >
          {/* Employee Distribution Card */}
          <Box
            sx={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%)',
              backdropFilter: 'blur(12px)',
              borderRadius: '20px',
              padding: 3,
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: `
                0 20px 40px -12px rgba(12, 43, 122, 0.15),
                0 10px 20px -8px rgba(0, 0, 0, 0.1),
                0 4px 8px -4px rgba(0, 0, 0, 0.08),
                inset 0 -1px 2px rgba(0, 0, 0, 0.05),
                inset 0 1px 2px rgba(255, 255, 255, 0.9)
              `,
              transform: 'perspective(1000px) rotateX(2deg)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.5s both',
              '@keyframes fadeInUp': {
                from: { opacity: 0, transform: 'perspective(1000px) translateY(20px) rotateX(5deg)' },
                to: { opacity: 1, transform: 'perspective(1000px) translateY(0) rotateX(2deg)' },
              },
              '&:hover': {
                transform: 'perspective(1000px) translateY(-8px) rotateX(1deg) scale(1.01)',
                boxShadow: `
                  0 28px 50px -12px rgba(12, 43, 122, 0.25),
                  0 16px 28px -8px rgba(0, 0, 0, 0.15),
                  0 8px 12px -4px rgba(0, 0, 0, 0.1),
                  inset 0 -1px 2px rgba(0, 0, 0, 0.05),
                  inset 0 1px 3px rgba(255, 255, 255, 1)
                `,
              },
            }}
          >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
                توزيع الموظفين
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  border: '1px solid rgba(229, 231, 235, 0.8)',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(255, 255, 255, 0.8)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
                    boxShadow: 'inset 0 2px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(255, 255, 255, 0.9)',
                  },
                }}
              >
                <Typography sx={{ fontSize: '0.65rem', color: '#6B7280', mr: 0.3, fontWeight: 500 }}>
                  الحالي
                </Typography>
                <ArrowDropDown sx={{ fontSize: '0.9rem', color: '#6B7280' }} />
              </Box>
            </Box>

            {/* Donut Chart with Custom Legend */}
            <Box sx={{ position: 'relative', height: '160px', mt: 0.5 }}>
              <SafeECharts option={employeeDistributionOption} style={{ height: '100%', width: '100%' }} />

              {/* Custom Legend - Right Side Vertical Column */}
              <Box
                sx={{
                  position: 'absolute',
                  right: 5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  direction: 'rtl',
                }}
              >
                {((employeeDistributionOption.series as any)[0]).data.map((item: any, index: number) => {
                  // Extract solid color from gradient (use the darker end color)
                  let solidColor = '#0c2b7a';
                  if (item.itemStyle?.color?.colorStops) {
                    solidColor = item.itemStyle.color.colorStops[item.itemStyle.color.colorStops.length - 1]?.color || '#0c2b7a';
                  } else if (typeof item.itemStyle?.color === 'string') {
                    solidColor = item.itemStyle.color;
                  }

                  return (
                    <Box
                      key={item.name}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                      }}
                    >
                      {/* Rounded Rectangle Indicator */}
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '2px',
                          backgroundColor: solidColor,
                          border: '2px solid #fff',
                          flexShrink: 0,
                        }}
                      />
                      {/* Label */}
                      <Typography
                        sx={{
                          fontSize: '9px',
                          color: '#4B5563',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Button */}
            <Button
              fullWidth
              variant="contained"
              disabled
              sx={{
                mt: 1,
                background: 'linear-gradient(135deg, #1043a3 0%, #0c2b7a 50%, #0a2461 100%)',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '10px',
                padding: '9px',
                boxShadow: `
                  0 4px 12px rgba(12, 43, 122, 0.3),
                  0 2px 6px rgba(0, 0, 0, 0.15),
                  inset 0 -1px 2px rgba(0, 0, 0, 0.1),
                  inset 0 1px 2px rgba(255, 255, 255, 0.3)
                `,
                cursor: 'default',
                border: '1px solid rgba(16, 67, 163, 0.5)',
                '&.Mui-disabled': {
                  background: 'linear-gradient(135deg, #1043a3 0%, #0c2b7a 50%, #0a2461 100%)',
                  color: '#FFFFFF',
                  opacity: 0.95,
                },
              }}
            >
              عرض التفاصيل
            </Button>
          </Box>

          {/* Monthly Payroll Card */}
          <Box
            sx={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%)',
              backdropFilter: 'blur(12px)',
              borderRadius: '20px',
              padding: 3,
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: `
                0 20px 40px -12px rgba(12, 43, 122, 0.15),
                0 10px 20px -8px rgba(0, 0, 0, 0.1),
                0 4px 8px -4px rgba(0, 0, 0, 0.08),
                inset 0 -1px 2px rgba(0, 0, 0, 0.05),
                inset 0 1px 2px rgba(255, 255, 255, 0.9)
              `,
              transform: 'perspective(1000px) rotateX(2deg)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.7s both',
              '&:hover': {
                transform: 'perspective(1000px) translateY(-8px) rotateX(1deg) scale(1.01)',
                boxShadow: `
                  0 28px 50px -12px rgba(12, 43, 122, 0.25),
                  0 16px 28px -8px rgba(0, 0, 0, 0.15),
                  0 8px 12px -4px rgba(0, 0, 0, 0.1),
                  inset 0 -1px 2px rgba(0, 0, 0, 0.05),
                  inset 0 1px 3px rgba(255, 255, 255, 1)
                `,
              },
            }}
          >
            {/* Header */}
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', mb: 1 }}>
              اتجاه كشف الرواتب الشهري
            </Typography>

            {/* Bar Chart */}
            <Box sx={{ height: '150px' }}>
              <SafeECharts option={monthlyPayrollOption} style={{ height: '100%', width: '100%' }} />
            </Box>

            {/* Summary */}
            <Box
              sx={{
                mt: 1.5,
                display: 'flex',
                justifyContent: 'space-around',
                background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                borderRadius: '10px',
                padding: 1.5,
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(229, 231, 235, 0.8)',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.65rem', color: '#6B7280', mb: 0.3 }}>الشهر الحالي</Typography>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0c2b7a' }}>275 الف ر.س</Typography>
              </Box>
              <Box
                sx={{
                  width: '1px',
                  backgroundColor: '#E5E7EB',
                  mx: 1.5,
                }}
              />
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.65rem', color: '#6B7280', mb: 0.3 }}>المتوسط الشهري</Typography>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>260 الف ر.س</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Logo Section */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 1,
            animation: 'fadeIn 0.6s ease-out 1.2s both',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%)',
              borderRadius: '18px',
              padding: 2,
              width: '85px',
              height: '85px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: `
                0 12px 24px -6px rgba(12, 43, 122, 0.2),
                0 6px 12px -4px rgba(0, 0, 0, 0.1),
                0 2px 4px -2px rgba(0, 0, 0, 0.08),
                inset 0 -1px 2px rgba(0, 0, 0, 0.05),
                inset 0 1px 2px rgba(255, 255, 255, 0.9)
              `,
              backdropFilter: 'blur(10px)',
              transform: 'perspective(800px) rotateX(2deg)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'perspective(800px) translateY(-4px) rotateX(1deg) scale(1.05)',
                boxShadow: `
                  0 16px 32px -6px rgba(12, 43, 122, 0.3),
                  0 8px 16px -4px rgba(0, 0, 0, 0.15),
                  0 4px 6px -2px rgba(0, 0, 0, 0.1),
                  inset 0 -1px 2px rgba(0, 0, 0, 0.05),
                  inset 0 1px 3px rgba(255, 255, 255, 1)
                `,
              },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '70px',
                height: '60px',
              }}
            >
              <Image
                src="/assets/logo.png"
                alt="شعار تكنو"
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </Box>
          </Box>
        </Box>

        {/* Tagline */}
        <Box
          sx={{
            textAlign: 'center',
            mt: 1,
            animation: 'fadeIn 0.6s ease-out 1.4s both',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '1.15rem',
              lineHeight: 1.5,
              textShadow: '0 2px 16px rgba(0, 0, 0, 0.4), 0 1px 4px rgba(0, 0, 0, 0.3)',
              letterSpacing: '0.2px',
            }}
          >
            نظام إدارة شامل
            <br />
            للموظفين والمشاريع وكشوف الرواتب والمخزون
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
