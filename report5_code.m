clc, clear;

kalibrasyon degerleri
S = [ 2.5 30;
 2.5 60;
 2.5 130;
 2.5 190;
 108 10;
 108 80;
 108 120;
 108 180];
load calib_im.txt;
x = calculate_conformal(calib_im, S, 1);

% centroid okuma ve marker takip algoritmas?
m_lost = 0;
start_flag = 0;
for i=1:105
RGB = imread(sprintf('C:\\fettah_sut2_C001H001S00010000%d.jpg',i));
mask=255*zeros(size(RGB));
mask=insertShape(mask,'FilledRectangle',[0 0  1024 250],'Color','white');
mask=uint8(mask);
RGB(mask ~= 0) = mask(mask ~= 0);
imshow(RGB);
I = rgb2gray(RGB);
bw = im2bw(I, 0.7);
cg = regionprops(bw, 'centroid');
cg_centroids = cat(1, cg.Centroid);
cg_centroids= sortrows(cg_centroids,2);
if length(cg) == 4
m_lost = m_lost + 1;
centroids_data(1,1,i) = centroids_data(1,1,i-m_lost);
centroids_data(1,2,i) = centroids_data(1,2,i-m_lost);
for p=2:5
centroids_data(p,1,i) = cg_centroids(p-1,1);
centroids_data(p,2,i) = cg_centroids(p-1,2);
end
else
m_lost = 0;
centroids_data(:,1,i) = cg_centroids(:,1);
centroids_data(:,2,i) = cg_centroids(:,2);
end
if start_flag == 1
for j=1:5
 for p=1:5
 a = [centroids_data(j,1,i) centroids_data(j,2,i)];
 b = [centroids_data(p,1,i-1) centroids_data(p,2,i-1)];
 distances(j,p,i) = norm(a-b);
 d = diag(distances(:,:,i));
 end
[M,index] = min(distances(j,:,i));
if distances(j,j,i) > M
    swap_x = centroids_data(j,1,i);
    swap_y = centroids_data(j,2,i);
    centroids_data(j,1,i) = centroids_data(index,1,i);
    centroids_data(j,2,i) = centroids_data(index,2,i);
    centroids_data(index,1,i) = swap_x;
    centroids_data(index,2,i) = swap_y;
end
end

for j=1:5
 for p=1:5
 a = [centroids_data(j,1,i) centroids_data(j,2,i)];
 b = [centroids_data(p,1,i-1) centroids_data(p,2,i-1)];
 distances(j,p,i) = norm(a-b);
 end
[M,index] = min(distances(j,:,i));
if distances(j,j,i) > M
    swap_x = centroids_data(j,1,i);
    swap_y = centroids_data(j,2,i);
    centroids_data(j,1,i) = centroids_data(index,1,i);
    centroids_data(j,2,i) = centroids_data(index,2,i);
    centroids_data(index,1,i) = swap_x;
    centroids_data(index,2,i) = swap_y;
end
end
for j=1:5
 for p=1:5
 a = [centroids_data(j,1,i) centroids_data(j,2,i)];
 b = [centroids_data(p,1,i-1) centroids_data(p,2,i-1)];
 distances(j,p,i) = norm(a-b);
 d = diag(distances(:,:,i));
 end
[M,index] = min(distances(j,:,i)); 
if distances(j,j,i) > M
    swap_x = centroids_data(j,1,i);
    swap_y = centroids_data(j,2,i);
    centroids_data(j,1,i) = centroids_data(index,1,i);
    centroids_data(j,2,i) = centroids_data(index,2,i);
    centroids_data(index,1,i) = swap_x;
    centroids_data(index,2,i) = swap_y;
end
end
end
start_flag = 1;
end


%markerlar?n pozisyonlar?na göre degiskenlere ayrilmasi
for i=1:105
centroids_data(:,2,i) = 1024 - centroids_data(:,2,i);
hip(i,:) = centroids_data(1,:,i);
knee(i,:) = centroids_data(2,:,i);
heel(i,:) = centroids_data(3,:,i);
ankle(i,:) = centroids_data(4,:,i);
toe(i,:) = centroids_data(5,:,i);
end

%cm olarak tekrark hesaplanmas?
hip_cm = calculate_reconformal(x, hip);
hip_cm(:,1) = hip_cm(:,1)/100;
hip_cm(:,2) = hip_cm(:,2)/100;

knee_cm = calculate_reconformal(x, knee);
knee_cm(:,1) = knee_cm(:,1)/100;
knee_cm(:,2) = knee_cm(:,2)/100;

ankle_cm = calculate_reconformal(x, ankle);
ankle_cm(:,1) = ankle_cm(:,1)/100;
ankle_cm(:,2) = ankle_cm(:,2)/100;

heel_cm = calculate_reconformal(x, heel);
heel_cm(:,1) = heel_cm(:,1)/100;
heel_cm(:,2) = heel_cm(:,2)/100;

toe_cm = calculate_reconformal(x, toe);
toe_cm(:,1) = toe_cm(:,1)/100;
toe_cm(:,2) = toe_cm(:,2)/100;


%filtre fonksiyonu
[b,a]= butter(2,10/250,'low');
%filtrelenecek marker degiskenini giriniz
filtering_marker = knee_cm;

%filtreleme
filterData(:,1) = filtfilt(b,a,(filtering_marker(:,1)));
filterData(:,2) = filtfilt(b,a,(filtering_marker(:,2)));

%velocity
for p=1:length(filterData)
if p <= 103
filterData(p+1,3)=(filterData(p+2,1)-filterData(p,1))/(2/500);
filterData(p+1,4)=(filterData(p+2,2)-filterData(p,2))/(2/500);
end
end
figure(1), plot(filterData(:,3),'.');grid on;
title('... velocity');
xlabel('frames');
ylabel('meters/seconds');
hold on
figure(1), plot(filterData(:,4),'.');grid on;
legend('Vx','Vy');




%acceleration
for p=3:length(filterData)
if p <= 102
filterData(p,5)=(filterData(p+1,3)-filterData(p-1,3))/(2/500);
filterData(p,6)=(filterData(p+1,4)-filterData(p-1,4))/(2/500);
end
end
figure(2), plot(filterData(:,5),'-');grid on;
title('... acceleration');
xlabel('frames');
ylabel('meters/seconds');
hold on
figure(2), plot(filterData(:,6),'-');grid on;
legend('Vx','Vy');




%acisal hiz
[h ,w] = freqz(b,a,filterData(:,1));
figure(3),plot(w);grid on;
hold on
title('... angular velocity');
xlabel('frames');
ylabel('w');
[h ,w] = freqz(b,a,filterData(:,2));
figure(3),plot(w);grid on;
legend('Vx','Vy');


