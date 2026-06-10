#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音/快手视频爬虫
注意: 此代码仅供学习研究使用，请遵守各平台的服务条款和版权法规。
"""

import os
import re
import json
import time
import random
import requests
from urllib.parse import urlencode
from datetime import datetime

# 创建下载目录
DOWNLOAD_DIR = "videos"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


class VideoSpider:
    """视频爬虫基类"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        })

    def download_file(self, url, filename):
        """下载文件到本地"""
        try:
            response = self.session.get(url, stream=True, timeout=30)
            response.raise_for_status()

            filepath = os.path.join(DOWNLOAD_DIR, filename)
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            print(f"  ✓ 下载完成: {filename}")
            return True
        except Exception as e:
            print(f"  ✗ 下载失败: {e}")
            return False

    def random_delay(self):
        """随机延时，避免请求过快"""
        time.sleep(random.uniform(1, 3))


class DouyinSpider(VideoSpider):
    """抖音视频爬虫"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://www.douyin.com"

    def get_video_by_aweme_id(self, aweme_id):
        """
        通过视频ID获取视频信息
        aweme_id: 抖音视频的aweme_id (如 7324903294059453702)
        """
        api_url = f"https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids={aweme_id}"

        try:
            response = self.session.get(api_url, timeout=10)
            data = response.json()

            if data.get('status_code') == 0 and data.get('item_list'):
                item = data['item_list'][0]
                video_info = item.get('video', {})
                play_addr = video_info.get('play_addr', {})

                # 尝试获取无水印链接
                url_list = play_addr.get('url_list', [])
                if url_list:
                    # 通常第一个链接是无水印的
                    video_url = url_list[0] if url_list else None
                else:
                    video_url = None

                return {
                    'title': item.get('desc', f'douyin_{aweme_id}'),
                    'video_url': video_url,
                    'author': item.get('author', {}).get('nickname', 'unknown'),
                    'aweme_id': aweme_id,
                }
            return None
        except Exception as e:
            print(f"获取视频信息失败: {e}")
            return None

    def search_videos(self, keyword, max_count=10):
        """
        搜索视频
        注意: 抖音搜索API可能需要登录态
        """
        print(f"\n🔍 在抖音搜索: {keyword}")

        # 方法1: 使用搜索API
        search_url = "https://www.douyin.com/aweme/v1/web/search/item/"

        params = {
            'keyword': keyword,
            'search_source': 'normal_search',
            'query_correct_type': 1,
            'is_filter_search': 0,
            'offset': 0,
            'count': max_count,
        }

        try:
            # 注意: 实际使用时可能需要处理登录态和签名
            response = self.session.get(search_url, params=params, timeout=10)
            data = response.json()

            videos = []
            if data.get('status_code') == 0:
                for item in data.get('data', []):
                    aweme_id = item.get('aweme_id')
                    if aweme_id:
                        videos.append({
                            'aweme_id': aweme_id,
                            'title': item.get('desc', ''),
                            'author': item.get('author', {}).get('nickname', ''),
                        })

            return videos
        except Exception as e:
            print(f"搜索失败: {e}")
            return []

    def download_video(self, video_info, filename=None):
        """下载抖音视频"""
        if not video_info or not video_info.get('video_url'):
            print("  ✗ 视频URL无效")
            return False

        if not filename:
            # 清理文件名
            title = re.sub(r'[<>:"/\\|?*]', '', video_info['title'])
            title = title[:50] if len(title) > 50 else title
            filename = f"douyin_{video_info['aweme_id']}_{title}.mp4"

        return self.download_file(video_info['video_url'], filename)


class KuaishouSpider(VideoSpider):
    """快手视频爬虫"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://www.kuaishou.com"

    def get_video_by_id(self, video_id):
        """
        通过视频ID获取视频信息
        video_id: 快手视频ID
        """
        api_url = f"https://www.ieshouyi.com/feed"

        # 快手可能需要特定的请求方式
        headers = {
            'Referer': 'https://www.kuaishou.com/',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        }
        self.session.headers.update(headers)

        try:
            # 注意: 快手的实际API可能不同，这里仅作示例
            response = self.session.get(api_url, timeout=10)
            print(f"响应状态: {response.status_code}")
            return None
        except Exception as e:
            print(f"获取视频信息失败: {e}")
            return None

    def search_videos(self, keyword, cursor=0, count=9):
        """
        搜索视频
        快手搜索API
        """
        print(f"\n🔍 在快手搜索: {keyword}")

        search_url = "https://www.kuaishou.com/graphql"

        query = """
        query SearchFeeds($keyword: String, $cursor: Int, $count: Int) {
            searchFeeds(keyword: $keyword, cursor: $cursor, count: $count) {
                feeds {
                    id
                    caption
                    poster
                    author {
                        name
                    }
                    video {
                        url
                    }
                }
                cursor
                hasMore
            }
        }
        """

        variables = {
            'keyword': keyword,
            'cursor': cursor,
            'count': count,
        }

        try:
            response = self.session.post(
                search_url,
                json={'query': query, 'variables': variables},
                timeout=10
            )
            data = response.json()

            videos = []
            if 'data' in data and 'searchFeeds' in data['data']:
                for item in data['data']['searchFeeds'].get('feeds', []):
                    videos.append({
                        'id': item.get('id'),
                        'title': item.get('caption', ''),
                        'author': item.get('author', {}).get('name', ''),
                        'video_url': item.get('video', {}).get('url'),
                        'poster': item.get('poster'),
                    })

            return videos
        except Exception as e:
            print(f"搜索失败: {e}")
            return []


def demo():
    """演示如何使用爬虫"""

    print("=" * 60)
    print("📱 抖音/快手 视频爬虫")
    print("=" * 60)

    # 演示: 抖音
    print("\n【抖音爬虫演示】")
    douyin = DouyinSpider()

    # 示例: 通过视频ID获取视频
    # 注意: 请使用真实的视频ID
    # aweme_id = "7324903294059453702"  # 示例ID
    # video_info = douyin.get_video_by_aweme_id(aweme_id)
    # if video_info:
    #     douyin.download_video(video_info)

    print("  提示: 抖音需要登录态才能搜索，请使用已登录的Cookie")

    # 演示: 快手
    print("\n【快手爬虫演示】")
    kuaishou = KuaishouSpider()

    print("  提示: 快手可能需要特定的处理方式")

    print("\n" + "=" * 60)
    print("⚠️  注意事项:")
    print("  1. 请仅下载自己有版权的内容")
    print("  2. 不要大规模爬取或用于商业用途")
    print("  3. 遵守各平台的服务条款")
    print("=" * 60)


def main():
    """主函数"""
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║           抖音/快手 视频下载工具                              ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  功能:                                                       ║
    ║    1. 抖音视频下载                                            ║
    ║    2. 快手视频下载                                           ║
    ║    3. 关键词搜索视频                                          ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  注意:                                                        ║
    ║    ⚠️ 仅供学习研究使用                                        ║
    ║    ⚠️ 请遵守平台服务条款和版权法规                             ║
    ╚══════════════════════════════════════════════════════════════╝
    """)

    # 简单交互菜单
    print("\n请选择操作:")
    print("  1. 抖音视频下载")
    print("  2. 快手视频下载")
    print("  3. 演示模式")

    choice = input("\n请输入选项 (1-3): ").strip()

    if choice == '1':
        print("\n【抖音模式】")
        print("请输入视频ID (aweme_id)，或者直接回车查看演示:")

        # 示例用法
        print("\n--- 抖音使用方法 ---")
        print("""
        douyin = DouyinSpider()

        # 方法1: 通过视频ID下载
        aweme_id = "你的视频ID"
        video_info = douyin.get_video_by_aweme_id(aweme_id)
        if video_info:
            douyin.download_video(video_info)

        # 方法2: 搜索并下载
        videos = douyin.search_videos("关键词")
        for video in videos[:5]:
            video_info = douyin.get_video_by_aweme_id(video['aweme_id'])
            if video_info:
                douyin.download_video(video_info)
        """)

    elif choice == '2':
        print("\n【快手模式】")
        print("请访问快手网页版获取视频链接")
        print("\n--- 快手使用方法 ---")
        print("""
        kuaishou = KuaishouSpider()

        # 搜索视频
        videos = kuaishou.search_videos("关键词")
        for video in videos:
            if video.get('video_url'):
                filename = f"{video['id']}.mp4"
                kuaishou.download_file(video['video_url'], filename)
        """)

    else:
        demo()


if __name__ == "__main__":
    main()
