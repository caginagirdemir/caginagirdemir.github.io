%% soru 2 a
clc,clear
load('phoneIMU')
for i=1:2311
R(i,1) = sqrt(sum(a(i,1).^2 + a(i,2).^2 + a(i,3).^2, 2));
end
figure(1);
subplot(3,1,1);
plot1 = plot(t_a,R);
xlabel('Time (sec)')
ylabel('Acceleration')

subplot(3,1,2);
for i=1:2311
R(i,1) = R(i,1)- 9.8 ;
end
plot2 = plot(t_a,R);
xlabel('Time (sec)')
ylabel('No gravity')

subplot(3,1,3);
[b,a1]= butter(1,10/60,'low');
R_f(:,1) = filtfilt(b,a1,(R(:,1)));
plot3 = plot(t_a,R_f);
xlabel('Time (sec)')
ylabel('Filtered')

%% soru 2 b
figure(2);
subplot(3,1,1);
plot3 = plot(t_a,R_f);
xlabel('Time (sec)')
ylabel('Acceleration')
subplot(3,1,2);
velocity=cumtrapz(t_a,R_f);
plot(t_a,velocity)
xlabel('Time (s)')
ylabel('Velocity (m/s)')
subplot(3,1,3);
Displacement=cumtrapz(t_a,velocity);
plot(t_a,Displacement)
xlabel('Time (s)')
ylabel('Position (m)')

%% soru 2 c
figure(3);
subplot(3,1,1);
plot3 = plot(t_a,velocity);
xlabel('Time (sec)')
ylabel('Velocity')
subplot(3,1,2);
[b2 a2] = butter(6,0.1/30,'high');
velocity_f = filtfilt(b2,a2,velocity);
plot(t_a,velocity_f)
xlabel('Time (s)')
ylabel('Velocity (m/s)')

subplot(3,1,3);
Displacement=cumtrapz(velocity_f);
[b3 a3] = butter(1,1/30,'high');
Displacement_f = filtfilt(b3,a3,Displacement);
[b3 a3] = butter(1,5/30,'low');
Displacement_2f = filtfilt(b3,a3,Displacement_f);
plot(t_a,Displacement_2f)
xlabel('Time (s)')
ylabel('Position (m)')
