clc, clear;
m_lost = 0;
start_flag = 0;

for i=1:105
    
    
%<-------centroid belirleme komutlar?------>
RGB = imread(sprintf('C:\\fettah_sut2_C001H001S00010000%d.jpg',i));
RGB = imcrop(RGB,[2.75219941348985 172.41788856305 1021.74780058651 852.08211143695]);
I = rgb2gray(RGB);
bw = im2bw(I, 0.7);
cg = regionprops(bw, 'centroid');
cg_centroids = cat(1, cg.Centroid);
cg_centroids= sortrows(cg_centroids,2);

%<-------- missing_marker durumu ------->
if length(cg) == 4
m_lost = m_lost + 1;
centroids_data(1,1,i) = centroids_data(1,1,i-m_lost);
centroids_data(1,2,i) = centroids_data(1,2,i-m_lost);
for p=2:5
centroids_data(p,1,i) = cg_centroids(p-1,1);
centroids_data(p,2,i) = cg_centroids(p-1,2);
end
%<-------- normal durum ------->
else
m_lost = 0;
centroids_data(:,1,i) = cg_centroids(:,1);
centroids_data(:,2,i) = cg_centroids(:,2);
end



%<--------marker takip algoritmas?-------->
if start_flag == 1
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




%<--------ikinci marker takip algoritmas?-------->
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


%<--------üçüncü marker takip algoritmas?-------->
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

end %if start_flag == 1
start_flag = 1;


end

%<-----video nesnesi olu?turma------>
aviobj = VideoWriter('kick.avi','Uncompressed AVI');
aviobj.FrameRate = 25;
open(aviobj);



for i=1:105
%<-----frameleri dosyadan tekrar okuma------>

RGB = imread(sprintf('C:\\fettah_sut2_C001H001S00010000%d.jpg',i));
RGB = imcrop(RGB,[2.75219941348985 172.41788856305 1021.74780058651 852.08211143695]);
imshow(RGB);
hold on


renk = 'bmgyr';
for d = 1 : 5
%<------renkli yuvarlak i?aretleme-------->
plot(centroids_data(d,1,i),centroids_data(d,2,i),'o',...
    'LineWidth',1,...
    'MarkerSize',5,...
    'MarkerEdgeColor',renk(d))

%<------koordinatlar?n yaz?lmas?e-------->
 text(centroids_data(d,1,i) + 50, ...
 centroids_data(d,2,i), ...
 sprintf('%3.3f,%3.3f', ...
 centroids_data(d,1,i), ...
 centroids_data(d,2,i)), ...
 'Color', renk(d), 'FontSize',12);
end

%<------markerlar aras? çizgilerin çizilmesi-------->
x = [centroids_data(1,1,i) centroids_data(2,1,i) centroids_data(4,1,i) ...
    centroids_data(3,1,i) centroids_data(5,1,i) centroids_data(4,1,i)];
y = [centroids_data(1,2,i) centroids_data(2,2,i) centroids_data(4,2,i) ...
    centroids_data(3,2,i) centroids_data(5,2,i) centroids_data(4,2,i)];
line(x,y,'Color','white','LineStyle','--');


frame = getframe(gcf);
writeVideo(aviobj, frame);
end




close(aviobj);



