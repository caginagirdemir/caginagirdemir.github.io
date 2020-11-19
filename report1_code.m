%% <<< on file(vicon_all_labelled.txt) data read >>>
format long g
 clc,clear
fid = fopen('C:\vicon_all_labelled.txt','r');
counter = 1;
eul_c = 1;
 for c=1:41771
    line=fgets(fid) ;
      E   = textscan(line, 'Local Rotation EulerXYZ: %f%f%f 0' ...                
                , 'Delimiter', {','}      ...
                 , 'Whitespace', '() ');
        
       if(E{1,1} ~= 0)
       eul_x = E{1,1};
       eul_y = E{1,2};
       eul_z = E{1,3};
       eul_f(eul_c,1) = eul_x;
       eul_f(eul_c,2) = eul_y;
       eul_f(eul_c,3) = eul_z;
       eul_c = eul_c + 1;
       end
    
      M   = textscan(line, 'Marker #%f: M_%f %f%f%f 0' ...                
                , 'Delimiter', {','}      ...
                 , 'Whitespace', '() ');
   if M{1,1} == 1 | M{1,1} == 2 | M{1,1} == 3 | M{1,1} == 4 | M{1,1} == 5 %Marker sayi degiskeni geliyorsa 
   data(M{1,1},1) =  M{1,3};
   data(M{1,1},2) =  M{1,4};
   data(M{1,1},3) =  M{1,5};
   if M{1,1} == 5
       data_f(:,:,counter) = data(:,:);
       counter = counter + 1;
   end
   end
  end
fclose(fid);

%% <<< draw axis and calibration stick >>>

x = [data_f(1,1,1) data_f(4,1,1) data_f(3,1,1) data_f(2,1,1) data_f(4,1,1) data_f(5,1,1)];
y = [data_f(1,3,1) data_f(4,3,1) data_f(3,3,1) data_f(2,3,1) data_f(4,3,1) data_f(5,3,1)];
z = [data_f(1,2,1) data_f(4,2,1) data_f(3,2,1) data_f(2,2,1) data_f(4,2,1) data_f(5,2,1)];

figure(1)
plot3(x,y,z,'-o','Color','b','MarkerSize',10,'MarkerFaceColor','red');
axis equal
hold on
pt = [data_f(4,1,1) data_f(4,3,1) data_f(4,2,1)];
dir = [50 0 0 1];
q = quiver3(pt(1),pt(2),pt(3), dir(1),dir(2),dir(3),1.5);
q.LineWidth  = 3;
q.MaxHeadSize = 3;
q.ShowArrowHead = 'on';
dir = [0 -50 0 1];
q = quiver3(pt(1),pt(2),pt(3), dir(1),dir(2),dir(3),1.5);
q.LineWidth  = 3;
q.MaxHeadSize = 3;
q.ShowArrowHead = 'on';
dir = [0 0 50 1];
q = quiver3(pt(1),pt(2),pt(3), dir(1),dir(2),dir(3),1.5);
q.LineWidth  = 3;
q.MaxHeadSize = 3;
q.ShowArrowHead = 'on';

%% <<< video viconAnim.avi >>>
% 
% aviobj = VideoWriter('viconAnim.avi','Uncompressed AVI');
% aviobj.FrameRate = 25;
% open(aviobj);
% xlim([-100 200])
% ylim([-2500 1000])
% zlim([0 1400])
% axis([-100 200 -2500 1000 0 1400])
% [mode,visibility,direction] = axis('state')
% grid on
% pbaspect ([1 7 5])
% hold on
% for i=1:708
% 
%     
% X = [data_f(1,1,i) data_f(2,1,i) data_f(5,1,i)]
% Y = [data_f(1,3,i) data_f(2,3,i) data_f(5,3,i)];
% Z = [data_f(1,2,i) data_f(2,2,i) data_f(5,2,i)];
% fill3(X,Y,Z,1);
% frame = getframe(gcf);
% writeVideo(aviobj, frame);
% cla
% end
% close(aviobj);

%% <<< yaw,pitch,row plot >>> 


for i=1:708
eul = [eul_f(i,1),eul_f(i,2),eul_f(i,3)];
rotm = eul2rotm(eul,'XYZ');
rotmZYX = eul2rotm(eul,'ZYX');
rotmZYZ = eul2rotm(eul,'ZYZ');
roll(i,1) = atan2d(rotmZYX(2,1),rotmZYX(1,1));
pitch(i,1) = 1.5*atan((-1*rotmZYX(3,1))/sqrt((rotmZYX(3,2)^2) + (rotmZYX(3,3)^2)));
yaw(i,1) = -atand(rotmZYZ(3,2)/rotmZYZ(3,3));
end
figure(2)
subplot(3,1,1);
[b2 a2] = butter(1,25/60,'low');
roll = filtfilt(b2,a2,roll);
plot(roll)
ylabel('roll')


subplot(3,1,2);
plot(pitch)
ylabel('pitch')


subplot(3,1,3);
[b2 a2] = butter(1,5/30,'high');
yaw = filtfilt(b2,a2,yaw);
plot(yaw)
ylabel('yaw')
